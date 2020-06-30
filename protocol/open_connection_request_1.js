const OfflinePacket = require('./offline_packet')
const Identifiers = require('./identifiers')

'use strict'

class OpenConnectionRequest1 extends OfflinePacket {

    constructor() {
        super(Identifiers.OpenConnectionRequest1)
    }

    /** @type {number} */
    #mtuSize
    /** @type {number} */
    #protocol 

    read() {
        super.read()
        this.#mtuSize = (Buffer.byteLength(this.buffer) + 1) + 28
        this.readMagic()
        this.#protocol = this.readByte()
    }

    get mtuSize() {
        return this.#mtuSize
    }

    get protocol() {
        return this.#protocol
    }

}
module.exports = OpenConnectionRequest1