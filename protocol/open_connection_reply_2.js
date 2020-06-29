const OfflinePacket = require('./offline_packet')
const Identifiers = require('./identifiers')

'use strict'

class OpenConnectionReply2 extends OfflinePacket {

    constructor() {
        super(Identifiers.OpenConnectionReply2)
    }

    /** @type {number} */
    #serverGUID
    /** @type {{address: string, port: number, version: number}} */
    #clientAddress
    /** @type {number} */
    #mtuSize

    write() {
        this.writeByte(this.id)
        this.writeMagic()
        this.writeLong(this.#serverGUID)
        this.writeAddress(this.#clientAddress)
        this.writeShort(this.#mtuSize)
        this.writeByte(0)  // secure
    }

    set serverGUID(serverGUID) {
        this.#serverGUID = serverGUID
    }

    set clientAddress(clientAddress) {
        this.#clientAddress = clientAddress
    }

    set mtuSize(mtuSize) {
        this.#mtuSize = mtuSize
    }

}
module.exports = OpenConnectionReply2