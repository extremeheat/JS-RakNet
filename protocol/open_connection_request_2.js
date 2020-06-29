const OfflinePacket = require('./offline_packet')
const Identifiers = require('./identifiers')

'use strict'

class OpenConnectionRequest2 extends OfflinePacket {

    constructor() {
        super(Identifiers.OpenConnectionRequest2)
    }

    /** @type {{address: string, port: number, version: number}} */
    #serverAddress
    /** @type {number} */
    #mtuSize
    /** @type {number} */
    #clientGUID

    read() {
        this.readByte()  // Skip the packet ID
        this.readMagic()
        this.#serverAddress = this.readAddress()
        this.#mtuSize = this.readShort()
        this.#clientGUID = this.readLong()
    }

    get serverAddress() {
        return this.#serverAddress
    }

    get mtuSize() {
        return this.#mtuSize
    }

    get clientGUID() {
        return this.#clientGUID
    }

}
module.exports = OpenConnectionRequest2