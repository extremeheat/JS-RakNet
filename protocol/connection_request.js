const Packet = require('./packet')
const Identifiers = require('./identifiers')

'use strict'

class ConnectionRequest extends Packet {

    constructor() {
        super(Identifiers.ConnectionRequest)
    }

    #clientGUID
    #requestTimestamp

    read() {
        super.read()
        this.#clientGUID = this.readLong()
        this.#requestTimestamp = this.readLong()
        this.readByte()  // secure
    }

    get clientGUID() {
        return this.#clientGUID
    }

    get requestTimestamp() {
        return this.#requestTimestamp
    }
    
}
module.exports = ConnectionRequest