const Packet = require("./packet")
const Identifiers = require("./identifiers")

'use strict'

class NewIncomingConnection extends Packet {

    constructor() {
        super(Identifiers.NewIncomingConnection)
    }

    read() {
        
    }

}
module.exports = NewIncomingConnection