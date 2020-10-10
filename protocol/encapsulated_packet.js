const BitFlags = require('./bitflags')
const Reliability = require('./reliability')
const BinaryStream = require('@jsprismarine/jsbinaryutils').default

'use strict'

class EncapsulatedPacket {

    // Decoded Encapsulated content
    #buffer

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

    needACK = false
    identifierACK

    static fromBinary(stream) {
        let packet = new EncapsulatedPacket()
        let header = stream.readByte()
        packet.reliability = (header & 224) >> 5
        packet.split = (header & BitFlags.Split) > 0

        let length = stream.readShort()
        length >>= 3  
        if (length == 0) {
            throw new Error('Got an empty encapsulated packet')
        }

        if (Reliability.reliable(packet.reliability)) {
            packet.messageIndex = stream.readLTriad()
        }

        if (Reliability.sequenced(packet.reliability)) {
            packet.sequenceIndex = stream.readLTriad()
        }

        if (Reliability.sequencedOrOrdered(packet.reliability)) {
            packet.orderIndex = stream.readLTriad()
            packet.orderChannel = stream.readByte()
        }

        if (packet.split) {
            packet.splitCount = stream.readInt()
            packet.splitID = stream.readShort()
            packet.splitIndex = stream.readInt()
        }

        packet.buffer = stream.buffer.slice(stream.offset)
        stream.offset += length

        return packet
    }

    toBinary() {
        let stream = new BinaryStream()
        let header = this.#reliability << 5
        if (this.#split) {
            header |= BitFlags.Split
        }
        stream.writeByte(header)
        stream.writeShort(this.#buffer.length << 3)

        if (Reliability.reliable(this.#reliability)) {
            stream.writeLTriad(this.messageIndex)
        }

        if (Reliability.sequenced(this.#reliability)) {
            stream.writeLTriad(this.#sequenceIndex)
        }

        if (Reliability.sequencedOrOrdered(this.#reliability)) {
            stream.writeLTriad(this.#orderIndex)
            stream.writeByte(this.#orderChannel)
        }

        if (this.#split) {
            stream.writeInt(this.#splitCount)
            stream.writeShort(this.#splitID)
            stream.writeInt(this.#splitIndex)
        }

        stream.write(this.buffer)
        return stream
    }

    getTotalLength() {
        return 3 + this.buffer.length + 
        (typeof this.messageIndex !== 'undefined' ? 3 : 0) + 
        (typeof this.orderIndex !== 'undefined' ? 4 : 0) + 
        (this.split ? 10 : 0)
    }

    get buffer() {
        return this.#buffer
    }

    set buffer(buffer) {
        return this.#buffer = buffer
    }

    get reliability() {
        return this.#reliability
    }

    set reliability(reliability) {
        this.#reliability = reliability
    } 

    get messageIndex() {
        return this.#messageIndex
    }

    set messageIndex(messageIndex) {
        this.#messageIndex = messageIndex
    }

    get sequenceIndex() {
        return this.#sequenceIndex
    }

    set sequenceIndex(sequenceIndex) {
        this.sequenceIndex = sequenceIndex
    }

    get orderIndex()  {
        return this.#orderIndex
    }

    set orderIndex(orderIndex) {
        this.#orderIndex = orderIndex
    }

    get orderChannel() {
        return this.#orderChannel
    }

    set orderChannel(orderChannel) {
        this.#orderChannel = orderChannel
    }

    get split() {
        return this.#split
    }

    set split(split) {
        this.#split = split
    }

    get splitCount() {
        return this.#splitCount
    }

    set splitCount(splitCount) {
        this.#splitCount = splitCount
    }

    get splitIndex() {
        return this.#splitIndex
    }

    set splitIndex(splitIndex) {
        this.#splitIndex = splitIndex
    }

    get splitID() {
        return this.#splitID
    }

    set splitID(splitID) {
        this.#splitID = splitID
    }
}
module.exports = EncapsulatedPacket
