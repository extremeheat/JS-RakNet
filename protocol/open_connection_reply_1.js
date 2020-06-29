const OfflinePacket = require('./offline_packet')
const Identifiers = require('./identifiers')

'use strict'

class OpenConnectionReply1 extends OfflinePacket {
    
    constructor() {
        super(Identifiers.OpenConnectionReply1)
    }

    /** @type {number} */
    #serverGUID
    /** @type {number} */
    #mtuSize

    write() {
        this.writeByte(this.id)
        this.writeMagic()
        this.writeLong(this.#serverGUID)
        this.writeByte(0)  // secure
        this.writeShort(this.#mtuSize)
    }

    set serverGUID(serverGUID) {
        this.#serverGUID = serverGUID
    }

    set mtuSize(mtuSize) {
        this.#mtuSize = mtuSize
    }

}
module.exports = OpenConnectionReply1