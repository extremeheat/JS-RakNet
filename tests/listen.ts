import { Server, Client } from '../src/index'
import ServerName from '../src/utils/ServerName'

async function createBasicClientServer(hostname, port) {
  var listener, client
  await new Promise(res => {
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

    client = new Client(hostname, port)
    client.connect().then(() => {
      console.log(`[client] created socket`)
    })
    client.on('connecting', () => {
      console.log(`[client] connecting to ${hostname}/${port}`)
    })
    client.on('connected', () => {
      console.log(`[client] connected!`)
      res(true)
    })
  })
  return [listener, client]
}

async function testOutOfOrder(server: Server, client: Client) {
  
}

// Script intended to test, it istantiate a new RakNet listener 
async function test(hostname = '0.0.0.0', port = 19132) {
  const [server,client] = await createBasicClientServer(hostname, port)
  await testOutOfOrder(server, client)
}

test().then(() => {
  console.log('OK')
  process.exit(0) // ok
})
setTimeout(() => { // if not resolved within 4s, probably failed
  throw Error('test timed out')
}, 4000)