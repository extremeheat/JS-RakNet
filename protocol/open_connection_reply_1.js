const OfflinePacket = require('./offline_packet')
const Identifiers = require('./identifiers')

'use strict'

class OpenConnectionReply1 extends OfflinePacket {
    constructor() {
        super(Identifiers.OpenConnectionReply1)
    }

    /** @type {number} */
    serverGUID
    /** @type {number} */
    mtuSize

    read() {
        super.read()
        this.readMagic()
        this.serverGUID = this.readLong()
        this.readByte()  // secure
        this.mtuSize = this.readShort()
    }

    write() {
        super.write()
        this.writeMagic()
        this.writeLong(this.serverGUID)
        this.writeByte(0)  // secure
        this.writeShort(this.mtuSize)
    }
}
module.exports = OpenConnectionReply1