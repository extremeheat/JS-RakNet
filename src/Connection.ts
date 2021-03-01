import BinaryStream from "@jsprismarine/jsbinaryutils";
import ACK from "./protocol/ACK";
import BitFlags from "./protocol/bitflags";
import ConnectedPing from "./protocol/ConnectedPing";
import ConnectedPong from "./protocol/ConnectedPong";
import ConnectionRequest from "./protocol/ConnectionRequest";
import ConnectionRequestAccepted from "./protocol/ConnectionRequestAccepted";
import { DataPacket } from "./protocol/DataPacket"
import EncapsulatedPacket from "./protocol/EncapsulatedPacket";
import Identifiers from "./protocol/Identifiers";
import NACK from "./protocol/NACK";
import NewIncomingConnection from "./protocol/NewIncomingConnection";
import Reliability from "./protocol/reliability";
import InetAddress from "./utils/InetAddress";
const { SlidingReceiveWindow, SlidingOrderedWindow } = require('./SlidingWindow')

enum Priority {
  Normal,
  Immediate
}

const enum Status {
  Connecting, Connected, Disconnecting, Disconnected
}

export class Connection {
  mtuSize: number;
  address: InetAddress;
  state = Status.Connecting

  nackQueue = new Set<number>()
  ackQueue: number[] = []

  nextDatagram = new DataPacket()

  recvQueue: Buffer[] = []

  splitPackets = new Map<number, Map<number, EncapsulatedPacket>>()
  recoveryList = new Map<number, DataPacket>()

  receiveWindow = new SlidingReceiveWindow(128)
  reliableReceiveWindow = new SlidingOrderedWindow(128)
  // TODO: ReliableOrdered channels
  channelIndex = []

  lastUpdate = Date.now()

  sendMessageIndex = 0
  sendSequenceNumber = 0
  sendSplitID = 0

  running = true
  listener

  inLog; outLog;

  constructor(listener, mtuSize: number, address: InetAddress) {
    this.listener = listener
    this.mtuSize = mtuSize
    this.address = address

    this.inLog = (...args) => console.debug('-> ', ...args)
    this.outLog = (...args) => console.debug('<- ', ...args)

    for (let i = 0; i < 32; i++) {
      this.channelIndex[i] = 0
    }
  }

  /**
   * Called by listener to run connection ops
   * @param timestamp current tick time
   */
  update(timestamp: number) {
    if (this.running && (this.lastUpdate + 10000) < timestamp) {
      this.disconnect('timeout')
      return
    }

    // Send ACKs
    if (this.ackQueue.length > 0) {
      const pk = new ACK()
      pk.packets = this.ackQueue
      pk.encode()
      this.sendPacket(pk)
      this.ackQueue = []
    }

    // Send NACKs
    if (this.nackQueue.size) {
      const pk = new NACK()
      pk.packets = [...this.nackQueue],
        pk.encode()
      this.outLog('Sending NACK batch', this.nackQueue)
      this.nackQueue.clear()
    }

    // TODO: Resend packets where we don't get an ACK. Not a big deal since
    // we expect a NACK back anyways.

    this.sendQueue()
  }

  disconnect(reason = 'unknown') {

  }

  /**
   * Recieve online RakNet packets
   */
  receiveOnline(buffer: Buffer) {
    const header = buffer.readUInt8()

    if ((header & BitFlags.Valid) == 0) {
      // Don't handle offline packets
      return
    } else if (header & BitFlags.Ack) {
      return this.handleACK(buffer)
    } else if (header & BitFlags.Nack) {
      return this.handleNACK(buffer)
    } else {
      return this.handleDatagram(buffer)
    }
  }

  handleACK(buffer: Buffer) {
    let packet = new ACK()
    packet.buffer = buffer
    packet.decode()

    for (let seq of packet.packets) {
      if (this.recoveryList.has(seq)) {
        // Calc ping maybe
        this.recoveryList.delete(seq)
      }
    }
  }

  handleNACK(buffer) {
    let packet = new NACK()
    packet.buffer = buffer
    // debug('[raknet] -> NACK', buffer)
    packet.decode()

    for (let seq of packet.packets) {
      if (this.recoveryList.has(seq)) {
        let pk = this.recoveryList.get(seq)
        // pk.sendTime = Date.now()
        this.outLog('[raknet] resending NACK', pk.sequenceNumber)
        this.sendPacket(pk)

        this.recoveryList.delete(seq)
      }
    }
  }

  handleDatagram(buffer) {
    const dataPacket = DataPacket.from(buffer)
    console.assert(dataPacket.sequenceNumber != null, 'Packet sequence number cannot be null')
    // console.log('Reading datagram', buffer, dataPacket)

    this.ackQueue.push(dataPacket.sequenceNumber)

    this.receiveWindow.set(dataPacket.sequenceNumber, dataPacket)

    const [missing, have] = this.receiveWindow.read() as [number[], DataPacket[]]
    console.log('Reading', missing, have)
    for (const miss of missing) {
      this.nackQueue.add(miss)
    }
    if (this.nackQueue.size) this.inLog('NACKs while reading datagram', this.nackQueue)
    for (const datagram of have) {
      if (this.nackQueue.has(datagram.sequenceNumber)) {
        this.inLog('Recieved lost #', datagram.sequenceNumber)
        this.nackQueue.delete(datagram.sequenceNumber)
      }

      for (const packet of datagram.packets) {
        this.recievePacket(packet)
      }
    }
  }

  recievePacket(packet: EncapsulatedPacket) {
    this.inLog('-> Encapsulated', packet)
    if (packet.isReliable()) {
      this.reliableReceiveWindow.set(packet.messageIndex, packet)

      const readable = this.reliableReceiveWindow.read((lost) => console.log('!! LOST', lost))
      this.inLog('Reading reliable', readable)
      for (const pak of readable) {
        this.handlePacket(pak)
      }
    } else {
      this.handlePacket(packet)
    }
  }

  handleSplit(packet: EncapsulatedPacket) {
    if (this.splitPackets.has(packet.splitID)) {
      const splitPacket = this.splitPackets.get(packet.splitID)
      splitPacket.set(packet.splitIndex, packet)

      if (splitPacket.size === packet.splitCount) {
        const bufs = []
        for (let i = 0; i < packet.splitCount; i++) {
          bufs.push(splitPacket.get(i))
        }
        const encapsulated = new EncapsulatedPacket()
        encapsulated.buffer = Buffer.concat(bufs)

        this.splitPackets.delete(packet.splitID)
      }
    }
  }

  async handlePacket(packet: EncapsulatedPacket) {
    if (packet.split) {
      this.inLog('reading split')
      this.handleSplit(packet)
      return
    }

    const id = packet.buffer.readUInt8()

    // console.log('--- id', id, this.state, Status.Connecting)

    if (id < 0x80) {
      if (this.state == Status.Connecting) {
        if (id === Identifiers.ConnectionRequest && this.listener.server) {
          this.inLog('got connection request')
          this.handleConnectionRequest(packet.buffer)
        } else if (id === Identifiers.NewIncomingConnection && this.listener.server) {
          const pak = NewIncomingConnection.from(packet.buffer)

          const serverAddress = this.listener.socket.address
          if (serverAddress.port === pak.address.port) {
            this.state = Status.Connected
            this.listener.emit('openConnection', this)
          }
        } else if (id === Identifiers.ConnectionRequestAccepted && this.listener.client) {
          await this.handleConnectionRequestAccepted(packet.buffer)
          this.inLog('Connected!')
          this.state = Status.Connected
          this.listener.emit('connected', this)
        }
      } else if (id === Identifiers.DisconnectNotification) {
        this.disconnect('client disconnect')
      } else if (id === Identifiers.ConnectedPing) {
        await this.handleConnectedPing(packet.buffer)
      } else if (id === Identifiers.ConnectedPong) {
        await this.handleConnectedPong(packet.buffer)
      }
    } else if (this.state === Status.Connected) {
      this.listener.emit('encapsulated', packet, this.address)  // To fit in software needs later
    }
  }

  async handleConnectionRequestAccepted(buffer: Buffer) {
    this.inLog('CONNECTION ACCEPTED')
    let dataPacket = new ConnectionRequestAccepted()
    dataPacket.buffer = buffer
    dataPacket.decode()

    const pk = new NewIncomingConnection()
    pk.address = this.listener.address
    pk.systemAddresses = []
    for (let i = 0; i < 20; i++) {
      pk.systemAddresses.push(this.listener.address)
    }
    pk.requestTimestamp = dataPacket.requestTimestamp
    pk.acceptedTimestamp = dataPacket.acceptedTimestamp
    pk.encode()

    let sendPacket = new EncapsulatedPacket()
    sendPacket.reliability = 0
    sendPacket.buffer = pk.buffer

    return sendPacket
  }

  async handleConnectionRequest(buffer: Buffer) {
    const dataPacket = ConnectionRequest.from(buffer)

    let pk = new ConnectionRequestAccepted()
    pk.clientAddress = this.address
    pk.requestTimestamp = dataPacket.requestTimestamp
    pk.acceptedTimestamp = BigInt(Date.now())
    pk.encode()

    let sendPacket = new EncapsulatedPacket()
    sendPacket.reliability = 0
    sendPacket.buffer = pk.buffer

    this.addToQueue(sendPacket)
    console.log('SENDING CONN ACCEPT', pk)
  }

  async handleConnectedPing(buffer: Buffer) {
    let dataPacket = new ConnectedPing()
    dataPacket.buffer = buffer
    dataPacket.decode()

    let pk = new ConnectedPong()
    pk.clientTimestamp = dataPacket.clientTimestamp
    pk.serverTimestamp = BigInt(Date.now())
    pk.encode()

    let sendPacket = new EncapsulatedPacket()
    sendPacket.reliability = 0
    sendPacket.buffer = pk.buffer

    this.addToQueue(sendPacket)
  }

  sendConnectedPing() {
    const pk = new ConnectedPing()
    pk.clientTimestamp = BigInt(Date.now())
    pk.encode()

    let sendPacket = new EncapsulatedPacket()
    sendPacket.reliability = 0
    sendPacket.buffer = pk.buffer

    this.addToQueue(sendPacket, 1)
  }

  handleConnectedPong(buffer) {
    const pk = ConnectedPong.from(buffer)

    this.listener.lastPong = BigInt(pk.serverTimestamp || Date.now())
  }

  sendConnectionRequest(clientGUID, mtuSize) {
    const packet = new ConnectionRequest()
    // packet.mtuSize = mtuSize
    packet.clientGUID = clientGUID
    packet.requestTimestamp = BigInt(Date.now())
    packet.encode()

    let sendPacket = new EncapsulatedPacket()
    sendPacket.reliability = 0
    sendPacket.buffer = packet.buffer

    this.addToQueue(sendPacket, 1)
    this.outLog('Sending connection request')
  }

  addEncapsulatedToQueue(packet: EncapsulatedPacket, flags = Priority.Normal) {
    if (Reliability.isReliable(packet.reliability)) {
      packet.messageIndex = this.sendMessageIndex++

      if (packet.reliability == Reliability.ReliableOrdered) {
        packet.orderIndex = this.channelIndex[packet.orderChannel]++
      }
    }

    if (packet.getTotalLength() + 4 > this.mtuSize) {
      let buffers = [], i = 0, splitIndex = 0
      while (i < packet.buffer.length) {
        // Push format: [chunk index: int, chunk: buffer]
        buffers.push([(splitIndex += 1) - 1, packet.buffer.slice(i, i += this.mtuSize - 60)])
      }
      let splitID = ++this.sendSplitID % 65536
      for (let [count, buffer] of buffers) {
        let pk = new EncapsulatedPacket()
        pk.splitID = splitID
        pk.split = true
        pk.splitCount = buffers.length
        pk.reliability = packet.reliability
        pk.splitIndex = count
        pk.buffer = buffer
        if (count > 0) {
          pk.messageIndex = this.sendMessageIndex++
        } else {
          pk.messageIndex = packet.messageIndex
        }
        if (pk.reliability === 3) {
          pk.orderChannel = packet.orderChannel
          pk.orderIndex = packet.orderIndex
        }
        this.addToQueue(pk, flags | Priority.Immediate)
      }
    }
  }

  // Adds a packet to the queue
  protected addToQueue(pk: EncapsulatedPacket, flags = Priority.Normal) {
    let priority = flags & 0b1
    if (priority === Priority.Immediate) {
      const packet = new DataPacket()
      packet.sequenceNumber = this.sendSequenceNumber++
      packet.packets.push(pk.toBinary())
      packet.encode()
      this.sendPacket(packet)
      // packet.sendTime = Date.now()  
      this.recoveryList.set(packet.sequenceNumber, packet)
      console.log('sent now')
      return
    }
    console.log('qed')
    const length = this.nextDatagram.length()
    if (length + pk.getTotalLength() > this.mtuSize) {
      this.sendQueue()
    }

    this.nextDatagram.packets.push(pk.toBinary())
  }

  sendQueue() {
    if (this.nextDatagram.packets.length > 0) {
      this.nextDatagram.sequenceNumber = this.sendSequenceNumber++
      this.nextDatagram.encode()
      console.log('SENDING Q!')
      this.sendPacket(this.nextDatagram)
      // this.sendQueue.sendTime = Date.now()
      this.recoveryList.set(this.nextDatagram.sequenceNumber, this.nextDatagram)
      this.nextDatagram = new DataPacket()
    }
  }

  sendPacket(packet) {
    this.listener.sendBuffer(packet.buffer, this.address)
  }

  close() {
    // console.trace('[conn] Closing!')
    const stream = new BinaryStream(Buffer.from('\x00\x00\x08\x15', 'binary'))
    this.addEncapsulatedToQueue(EncapsulatedPacket.fromBinary(stream), Priority.Immediate)  // Client discconect packet 0x15
  }
}