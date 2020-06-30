const Listener = require('./listener')
const BinaryStream = require('jsbinaryutils')
const DataPacket = require('./protocol/data_packet')

// Script intended to test, it istantiate a new RakNet listener 
class Index {

    constructor() {
        this.listener = (new Listener).listen('0.0.0.0', 19132)
        this.listener.on('test', () => {
            console.log('Got a new connection')
        })
    }

}

new Index()