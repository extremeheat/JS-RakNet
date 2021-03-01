import Dgram from 'dgram'
import crypto from 'crypto'
import EventEmitter from 'events'
import { Connection } from "./Connection"
import InetAddress from './utils/InetAddress'
import OpenConnectionRequest1 from './protocol/OpenConnectionRequest1'
import UnconnectedPong from './protocol/UnconnectedPong'
import UnconnectedPing from './protocol/UnconnectedPing'
import OpenConnectionReply1 from './protocol/OpenConnectionReply1'
import OpenConnectionRequest2 from './protocol/OpenConnectionRequest2'
import OpenConnectionReply2 from './protocol/OpenConnectionReply2'
import Identifiers from './protocol/Identifiers'

// RakNet protocol versions 
const RAKNET_PROTOCOL = 10
const RAKNET_TPS = 100
const RAKNET_TICK_LENGTH = 1 / RAKNET_TPS

// Constantly reconnect with smaller MTU
const START_MTU_SIZE = 1492

const enum State {
  Waiting,
  Connecting,
  Connected
}

export class Client extends EventEmitter {
  client = true
  
  id: bigint
  socket: Dgram.Socket
  connection: Connection
  mtuSize = 1492
  state = State.Waiting

  hostname: string
  port: number
  address: InetAddress

  running = true
  lastPong = BigInt(Date.now())
  inLog; outLog;
  constructor(hostname: string, port: number) {
    super()
    console.assert(hostname.length, 'Hostname cannot be empty')
    console.assert(port, 'Port cannot be empty')
    this.hostname = hostname
    this.port = port
    this.address = new InetAddress(this.hostname, this.port)

    this.id = -7472034367240126457n

    this.inLog = (...args) => console.debug('C -> ', ...args)
    this.outLog = (...args) => console.debug('C <- ', ...args)
  }

  async connect() {
    this.socket = Dgram.createSocket({ type: 'udp4' })

    this.socket.on('message', (buffer, rinfo) => {
      this.inLog('[S->C]', buffer, rinfo)
      this.handle(buffer, rinfo)
    })

    await new Promise((resolve, reject) => {
      const failFn = e => reject(e)

      this.socket.once('error', failFn)
      this.socket.bind(null, null, () => {
        this.socket.removeListener('error', failFn)
        resolve(true)
      })
    })

    const MAX_CONNECTION_TRIES = 5
    for (let i = 0; i < MAX_CONNECTION_TRIES; i++) {
      this.outLog('Connecting with mtu', this.mtuSize)
      this.sendConnectionRequest()
      await sleep(1500) // Wait some time before sending another connection request
      if (this.state != State.Waiting) break
      this.mtuSize -= 100
    }

    this.startTicking()  // tick sessions
  }

  handle(buffer, rinfo) {
    let header = buffer.readUInt8()  // Read packet header to recognize packet type

    let token = `${rinfo.address}:${rinfo.port}`
    // debug('[raknet] Hadling packet', buffer, this.connection)
    if (this.connection && buffer[0] > 0x20) {
      this.connection.receiveOnline(buffer)
    } else {
      // debug('Header', header.toString(16))
      switch (header) {
        case Identifiers.UnconnectedPong:
          this.handleUnconnectedPong(buffer)
          break
        case Identifiers.OpenConnectionReply1:
          this.handleOpenConnectionReply1(buffer).then(buffer => {
            this.sendBuffer(buffer)
          })
          break
        case Identifiers.OpenConnectionReply2:
          this.handleOpenConnectionReply2(buffer)
          break
        case Identifiers.NoFreeIncomingConnections:
          this.inLog('[raknet] Server rejected connection - full?')
          this.emit('error', 'Server is full')
          break
        case Identifiers.ConnectionAttemptFailed:
          this.inLog('[raknet] Connection was rejected by server')
          this.emit('error', 'Connection request rejected')
          break
        default:
      }
    }
  }

  sendConnectionRequest() {
    this.outLog('sending connection req')
    const packet = new OpenConnectionRequest1()
    packet.mtuSize = this.mtuSize
    packet.protocol = RAKNET_PROTOCOL
    packet.encode()
    this.sendBuffer(packet.buffer)
    this.emit('connecting', { mtuSize: packet.mtuSize, protocol: RAKNET_PROTOCOL })
  }

  handleUnconnectedPong(buffer) {
    this.inLog('[raknet] got unconnected pong')
    const decodedPacket = new UnconnectedPong()
    decodedPacket.buffer = buffer
    decodedPacket.decode()
    this.lastPong = BigInt(decodedPacket.sendTimestamp)
    this.emit('unconnectedPong', this.lastPong)
  }

  sendUnconnectedPing() {
    const packet = new UnconnectedPing()
    packet.sendTimestamp = BigInt(Date.now())
    packet.clientGUID = this.id
    packet.encode()
    this.sendBuffer(packet.buffer)
  }

  async handleOpenConnectionReply1(buffer) {
    this.inLog('[raknet] Got OpenConnectionReply1')
    // this.state = 'connecting'
    const decodedPacket = new OpenConnectionReply1()
    decodedPacket.buffer = buffer
    decodedPacket.decode()

    const packet = new OpenConnectionRequest2()
    packet.mtuSize = decodedPacket.mtuSize
    packet.clientGUID = this.id
    packet.serverAddress = this.address
    // debug('MTU', decodedPacket, packet.mtuSize, packet.clientGUID, packet.serverAddress.address)
    packet.encode()

    return packet.buffer
  }

  async handleOpenConnectionReply2(buffer) {
    this.inLog('[client] Got conn reply 2')
    const decodedPacket = new OpenConnectionReply2()
    decodedPacket.buffer = buffer
    decodedPacket.decode()

    this.connection = new Connection(this, decodedPacket.mtuSize, this.address)
    this.connection.inLog = this.inLog
    this.connection.outLog = this.outLog
    this.connection.sendConnectionRequest(this.id, decodedPacket.mtuSize)
  }

  startTicking() {
    let ticks = 0
    let int = setInterval(() => {
      ticks++
      if (this.running) {
        this.connection?.update(Date.now())
        if (ticks % 100 == 0) { // TODO: How long do we wait before sending? about 1s for now
          this.outLog('Sending ping')
          this.connection ? this.connection.sendConnectedPing() : this.sendUnconnectedPing()

          let td = BigInt(Date.now()) - this.lastPong
          if (td > 4000) { // 4s timeout
            this.inLog(td, this.lastPong)
            // this.close('timeout')
            // this.shutdown = true
          }
        }
      } else {
        clearInterval(int)
      }
    }, RAKNET_TICK_LENGTH * 1000)
  }

  close(reason) {
    this.connection?.close()
    this.connection = null
    this.running = false
    this.outLog('[client] closing', reason)
    this.emit('closeConnection', reason)
  }

  removeConnection(args) {
    this.close(args)
  }

  /**
     * Send packet buffer to the server
     * 
     * @param {Buffer} buffer 
     * @param {string} address 
     * @param {number} port 
     */
  sendBuffer(buffer, to = this.address) {
    this.socket.send(buffer, 0, buffer.length, to.port, to.address)
    this.outLog('[C->S]', buffer)
  }
}

async function sleep(ms) {
  return new Promise(res => {
    setTimeout(() => {
      res(true)
    }, ms)
  })
}
