const Listener = require('./listener')
const Client = require('./client')
const BinaryStream = require('@jsprismarine/jsbinaryutils').default
const DataPacket = require('./protocol/data_packet')

// Script intended to test, it istantiate a new RakNet listener 
async function test(hostname = '0.0.0.0', port = 19132) {
    return new Promise((res, rej) => {
        this.listener = new Listener()
        this.listener.listen(hostname, port).then(() => {
            console.log(`Listening on ${hostname}:${port}`)
        })
        this.listener.on('test', () => {
            console.log('Got a new connection')
        })
        this.listener.on('unconnectedPong', (query) => {
            query.setMotd('Rewritten MOTD')
        })

        this.client = new Client(hostname, port)
        this.client.connect().then(() => {
            console.log(`[client] created socket`)
        })
        this.client.on('connecting', () => {
            console.log(`[client] connecting to ${hostname}/${port}`)
        })
        this.client.on('connected', () => {
            console.log(`[client] connected!`)
            res()
        })
    })
}

test().then(() => {
    console.log('OK')
    process.exit(0) // ok
})
setTimeout(() => { // if not resolved within 4s, probably failed
    throw Error('test timed out')
}, 4000)