const Packet = require("./packet")
const Identifiers = require("./identifiers")

'use strict'

class NewIncomingConnection extends Packet {

    constructor() {
        super(Identifiers.NewIncomingConnection)
    }

    #address

    read() {
        super.read()
        this.#address = this.readAddress()
        
        // Do not save in memory stuff we will not use
        for (let i = 0; i < 20; i++) {
            this.readAddress()
        }

        this.readLong()
        this.readLong()
    }

    get address() {
        return this.#address
    }

}
module.exports = NewIncomingConnection