const Packet = require('./packet')
const BitFlags = require('./bitflags')
const Reliability = require('./reliability')

'use strict'

class DataPacket extends Packet {

    // Decoded Encapsulated content
    #content  

    // Packet sequence number
    // used to check for missing packets
    #sequenceNumber

    // Encapsulation decoded fields
    #reliability

    #messageIndex
    #sequenceIndex
    #orderIndex
    #orderChannel

    #split
    // If packet is not splitted all those
    // fields remains undefined
    #splitCount
    #splitIndex
    #splitID

    read() {
        super.read()
        this.#sequenceNumber = this.readLTriad()
        
        let header = this.readByte()
        this.#reliability = (header & 224) >> 5
        this.#split = (header & BitFlags.Split) > 0

        let length = this.readShort()
        length >>= 3  // devide length by 8
        if (length == 0) {
            throw new Error('Got an empty encapsulated packet')
        }

        if (Reliability.reliable(this.#reliability)) {
            this.#messageIndex = this.readLTriad()
        }

        if (Reliability.sequenced(this.#reliability)) {
            this.#sequenceIndex = this.readLTriad()
        }

        if (Reliability.sequencedOrOrdered(this.#reliability)) {
            this.#orderIndex = this.readLTriad()
            this.#orderChannel = this.readByte()
        }

        if (this.#split) {
            this.splitCount = this.readInt()
            this.splitID = this.readShort()
            this.splitIndex = this.readInt()
        }

        this.#content = this.buffer.slice(this.offset, length)
    }

    // TODO
    write() {
        super.write()
    }

    get content() {
        return this.#content
    }

    get reliability() {
        return this.#reliability
    }

    get sequenceNumber() {
        return this.#sequenceNumber
    }

    get messageIndex() {
        return this.#messageIndex
    }

    get sequenceIndex() {
        return this.#sequenceIndex
    }

    get orderIndex()  {
        return this.#orderIndex
    }

    get orderChannel() {
        return this.#orderChannel
    }

    get split() {
        return this.#split
    }

    get splitCount() {
        return this.#splitCount
    }

    get splitIndex() {
        return this.#splitIndex
    }

    get splitID() {
        return this.#splitID
    }

}
module.exports = DataPacket