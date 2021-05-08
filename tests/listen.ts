import { Server, Client, EncapsulatedPacket } from '../src/index'
import ServerName from '../src/utils/ServerName'
import crypto from 'crypto'
import BinaryStream from '@jsprismarine/jsbinaryutils'
import Reliability from '../src/protocol/reliability'

globalThis.debuggingRaknet = true

async function createBasicClientServer(hostname, port) {
  var listener, client
  await new Promise((res, rej) => {
    console.log(this)
    listener = new Server(hostname, port, new ServerName())
    listener.listen().then(() => {
      console.log(`Listening on ${hostname}:${port}`)
    })
    listener.on('test', () => {
      console.log('Got a new connection')
    })
    listener.on('unconnectedPong', (query) => {
      query.setMotd('Rewritten MOTD')
    })

    let serverOpened = false
    listener.on('openConnection', () => {
      serverOpened = true
    })

    client = new Client(hostname, port)
    client.connect().then(() => {
      console.log(`[client] created socket`)
    })
    client.on('connecting', () => {
      console.log(`[client] connecting to ${hostname}/${port}`)
    })
    client.on('connected', () => {
      console.log(`[client] connected!`)
      setTimeout(() => {
        if (serverOpened) res(true)
        else rej("Server did not open connection")
      }, 500)
    })
  })
  return [listener, client]
}

async function sendTest(server: Server, client: Client) {
  return new Promise((res) => {
    const pushed = []
    for (var i = 0; i < 10; i++) {
      const packet = new EncapsulatedPacket()
      packet.reliability = 0
      const buf = crypto.randomBytes(64)
      buf.writeUInt8(0xfe, 0)
      packet.buffer = buf
      pushed.push(buf)
      // console.info('SENDING', buf)
      client.connection.addEncapsulatedToQueue(packet)
    }

    let got = 0

    const serverClient = server.connections.values()[0]

    server.on('encapsulated', (buf) => {
      console.log('Encap', buf)
      got++
      if (got == 10) res(true)
    })
  })
}
let got = 0

async function testOrdered(server: Server, client: Client) {
  return new Promise((res) => {
    const pushed = []
    const count = 20
    for (var i = 0; i < count; i++) {
      const packet = new EncapsulatedPacket()
      packet.reliability = Reliability.ReliableOrdered
      const stream = new BinaryStream()
      stream.writeByte(0xfe)
      stream.writeByte(i)
      stream.append(crypto.randomBytes(2048))
      const buf = stream.getBuffer()
      packet.buffer = buf
      pushed[i] = buf
      // console.info('SENDING', buf)
      client.connection.addEncapsulatedToQueue(packet)
    }

    setTimeout(() => { // extra packet
      const packet = new EncapsulatedPacket()
      packet.reliability = Reliability.ReliableOrdered
      packet.buffer = Buffer.from([0xfe, count])
      pushed.push(packet.buffer)
      // console.info('SENDING F')
      client.connection.addEncapsulatedToQueue(packet, 1)
    }, 10)

    let last = 0

    server.on('encapsulated', (encap) => {
      // console.log('Encap', encap)
      const buf = encap.buffer
      got = buf.readUInt8(1, 1)
      if (last && got != (last + 1)) {
        console.warn(got, encap.buffer)
        throw Error(`got unordered ${got} != ${last}`)
      }
      if (pushed[got].toString('hex') != buf.toString('hex')) {
        throw Error(`Message mismatch ${pushed[got].toString('hex')} != ${buf.toString('hex')}`)
      }
      console.warn('Got', got, encap.buffer)
      last = got
      if (got == count) {
        server.removeAllListeners('encapsulated')
        res(true)
      }
    })
  })
}

async function testOutOfOrder(server: Server, client: Client) {
  return new Promise((res) => {
    const pushed = []
    var d = 0
    // @ts-ignore
    client._sendBuffer = client.sendBuffer
    // @ts-ignore
    client.sendBuffer = function (...args) {
      d++
      if (d % 4 == 0) return // force lost
      setTimeout(() => {
        // console.warn('sending', d)
        // @ts-ignore
        client._sendBuffer(...args)
      }, Math.random() * 100 | 0)
    }

    for (var i = 0; i < 10; i++) {
      const packet = new EncapsulatedPacket()
      packet.reliability = Reliability.ReliableOrdered
      const stream = new BinaryStream()
      stream.writeByte(0xfe)
      stream.writeByte(i)
      stream.append(crypto.randomBytes(1028))
      const buf = stream.getBuffer()
      packet.buffer = buf
      pushed.push(buf)
      // console.info('SENDING', buf)
      client.connection.addEncapsulatedToQueue(packet)
    }

    let last = 0

    server.on('encapsulated', (encap) => {
      // console.log('Encap', encap)
      const buf = encap.buffer
      got = buf.readUInt8(1, 1)
      if (last && got != (last + 1)) {
        throw Error(`got unordered ${got} != ${last}`)
      }
      console.warn('Got', got)
      last = got
      if (got == 9) {
        server.removeAllListeners('encapsulated')
        res(true)
      }
    })
  })
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

// Script intended to test, it istantiate a new RakNet listener 
async function test(hostname = '0.0.0.0', port = 19130) {
  const [server, client] = await createBasicClientServer(hostname, port)
  console.log('============')
  await sendTest(server,client)
  console.log('============')
  await testOrdered(server, client)
  console.log('============')
  await testOutOfOrder(server, client)
}

test().then(() => {
  console.log('OK')
  process.exit(0) // ok
})
setTimeout(() => { // if not resolved within 4s, probably failed
  console.log('Got', got)
  throw Error('test timed out')
}, 9000)