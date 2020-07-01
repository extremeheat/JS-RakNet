const Packet = require("./packet")
const Identifiers = require("./identifiers")

'use strict'

class ConnectedPong extends Packet {

    constructor() {
        super(Identifiers.ConnectedPong)
    }

    clientTimestamp
    serverTimestamp

    write() {
        super.write()
        this.writeLong(this.clientTimestamp)
        this.writeLong(this.serverTimestamp)
    }
    
}
module.exports = ConnectedPong