const OfflinePacket = require('./offline_packet')
const Identifiers = require('./identifiers')

'use strict'

class UnconnectedPing extends OfflinePacket {

    constructor() {
        super(Identifiers.UnconnectedPing)
    }

    /** @type {number} */
    #sendTimestamp
    /** @type {number} */
    #clientGUID

    read() {
        super.read()
        this.#sendTimestamp = this.readLong()
        this.readMagic()
        this.#clientGUID = this.readLong()
    }

    get sendTimeStamp() {
        return this.#sendTimestamp
    }

    get clientGUID() {
        return this.#clientGUID
    }

}
module.exports = UnconnectedPing

