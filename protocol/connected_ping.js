const Packet = require("./packet")
const Identifiers = require("./identifiers")

'use strict'

class ConnectedPing extends Packet {

    constructor() {
        super(Identifiers.ConnectedPing)
    }

    clientTimestamp

    read() {
        super.read()
        this.clientTimestamp = this.readLong()
    }
    
}
module.exports = ConnectedPing