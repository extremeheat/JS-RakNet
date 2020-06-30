const OfflinePacket = require('./offline_packet')
const Identifiers = require('./identifiers')

'use strict'

class UnconnectedPong extends OfflinePacket {
    
    constructor() {
        super(Identifiers.UnconnectedPong)
    }

    /** @type {number} */
    #sendTimestamp
    /** @type {number} */
    #serverGUID
    /** @type {string} */
    #serverName

    write() {
        super.write()
        this.writeLong(this.#sendTimestamp)
        this.writeLong(this.#serverGUID)
        this.writeMagic()
        this.writeString(this.#serverName)
    }

    /** @param {number} sendTimestamp */
    set sendTimestamp(sendTimestamp) {
        this.#sendTimestamp = sendTimestamp
    }

    /** @param {number} serverGUID */
    set serverGUID(serverGUID) {
        this.#serverGUID = serverGUID
    }

    /** @param {string} serverName */
    set serverName(serverName) {
        this.#serverName = serverName
    }
    
}
module.exports = UnconnectedPong