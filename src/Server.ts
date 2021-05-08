import Dgram from 'dgram'
import crypto from 'crypto'
import EventEmitter from 'events'
import { Connection } from "./Connection"
import ServerName from './utils/ServerName'
import Identifiers from './protocol/Identifiers'
import UnconnectedPong from './protocol/UnconnectedPong'
import OpenConnectionRequest1 from './protocol/OpenConnectionRequest1'
import OpenConnectionRequest2 from './protocol/OpenConnectionRequest2'
import IncompatibleProtocolVersion from './protocol/IncompatibleProtocolVersion'
import OpenConnectionReply1 from './protocol/OpenConnectionReply1'
import OpenConnectionReply2 from './protocol/OpenConnectionReply2'
import UnconnectedPing from './protocol/UnconnectedPing'
import InetAddress from './utils/InetAddress'
const debug = require('debug')('raknet')

// RakNet protocol versions 
const RAKNET_PROTOCOL = 10
const RAKNET_TPS = 100
const RAKNET_TICK_LENGTH = 1 / RAKNET_TPS

export class Server extends EventEmitter {
  server = true
  client = false
  running = true
  socket: Dgram.Socket

  connections = new Map<string, Connection>()

  hostname: string; port: number;
  serverName: ServerName
  inLog; outLog;

  serverId: bigint

  constructor(hostname: string, port: number, serverName: ServerName) {
    super()
    this.serverName = serverName
    this.serverId = crypto.randomBytes(8).readBigInt64BE(0)
    this.hostname = hostname
    this.port = port
    this.inLog = (...args) => debug('S -> ', ...args)
    this.outLog = (...args) => debug('S <- ', ...args)
  }

  async listen() {
    this.socket = Dgram.createSocket({ type: 'udp4' })
    this.serverName.serverId = this.serverId.toString()

    this.socket.on('message', (buffer, rinfo) => {
      this.inLog('[C->S]', buffer, rinfo)
      const sender = new InetAddress(rinfo.address, rinfo.port)
      this.handle(buffer, sender)
    })

    await new Promise((resolve, reject) => {
      const failFn = e => reject(e)

      this.socket.once('error', failFn)
      this.socket.bind(this.port, this.hostname, () => {
        this.socket.removeListener('error', failFn)
        resolve(true)
      })
    })

    this.startTicking()  // tick sessions
    return this
  }

  handle(buffer: Buffer, sender: InetAddress) {
    const header = buffer.readUInt8()  // Read packet header to recognize packet type

    if (this.connections.has(sender.hash)) {
      // console.log('<- online',header)
      const connection = this.connections.get(sender.hash)
      connection.recieve(buffer)
    } else { // Offline
      // console.log('<- offline',header)
      switch (header) {
        case Identifiers.UnconnectedPing:
          this.sendBuffer(this.handleUnconnectedPing(buffer), sender)
          break
        case Identifiers.OpenConnectionRequest1:
          this.sendBuffer(this.handleOpenConnectionRequest1(buffer), sender)
          break
        case Identifiers.OpenConnectionRequest2:
          this.sendBuffer(this.handleOpenConnectionRequest2(buffer, sender), sender)
          break
      }
    }
  }

  sendBuffer(sendBuffer: Buffer, client: InetAddress) {
    this.outLog('<- ', sendBuffer, client)
    this.socket.send(sendBuffer, 0, sendBuffer.length, client.port, client.address)
  }

  handleUnconnectedPing(buffer) {
    // Decode server packet
    const decodedPacket = new UnconnectedPing()
    decodedPacket.buffer = buffer
    decodedPacket.decode()

    // Check packet validity
    // To refactor
    if (!decodedPacket.isValid()) {
      throw new Error('Received an invalid offline message')
    }

    // Encode response
    const packet = new UnconnectedPong()
    packet.sendTimestamp = decodedPacket.sendTimestamp
    packet.serverGUID = this.serverId

    let serverQuery = this.serverName

    this.emit('unconnectedPong', serverQuery)

    packet.serverName = serverQuery.toString()
    packet.encode()

    return packet.buffer
  }

  handleOpenConnectionRequest1(buffer) {
    // Decode server packet
    const decodedPacket = new OpenConnectionRequest1()
    decodedPacket.buffer = buffer
    decodedPacket.decode()

    // Check packet validity
    // To refactor
    if (!decodedPacket.isValid()) {
      throw new Error('Received an invalid offline message')
    }

    if (decodedPacket.protocol !== RAKNET_PROTOCOL) {
      const packet = new IncompatibleProtocolVersion()
      packet.protocol = RAKNET_PROTOCOL
      packet.serverGUID = this.serverId
      packet.encode()
      return packet.buffer
    }

    // Encode response
    const packet = new OpenConnectionReply1()
    packet.serverGUID = this.serverId
    packet.mtuSize = decodedPacket.mtuSize
    packet.encode()

    return packet.buffer
  }

  handleOpenConnectionRequest2(buffer, address: InetAddress) {
    // Decode server packet
    const decodedPacket = new OpenConnectionRequest2()
    decodedPacket.buffer = buffer
    decodedPacket.decode()

    // Check packet validity
    // To refactor
    if (!decodedPacket.isValid()) {
      throw new Error('Received an invalid offline message')
    }

    // Encode response
    const packet = new OpenConnectionReply2()
    packet.serverGUID = this.serverId
    packet.mtuSize = decodedPacket.mtuSize
    packet.clientAddress = address
    packet.encode()

    // Create a session
    const conn = new Connection(this, decodedPacket.mtuSize, address)
    conn.inLog = this.inLog
    conn.outLog = this.outLog
    this.connections.set(address.hash, conn)

    return packet.buffer
  }

  startTicking() {
    const int = setInterval(() => {
      if (this.running) {
        for (const [_, connection] of this.connections) {
          connection.update(Date.now())
        }
      } else {
        this.emit('closing')
        clearInterval(int)
      }
    }, RAKNET_TICK_LENGTH * 1000)
  }

  close() {
    this.running = false
    for (const [k, v] of this.connections) {
      v.close()
    }
    this.socket.close(() => {
      this.emit('closed')
      this.removeAllListeners()
    })
    this.socket?.close()
  }
}