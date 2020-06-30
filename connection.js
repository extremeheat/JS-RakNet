const EventEmitter  = require('events')

const BitFlags = require('./protocol/bitflags')
const InetAddress = require('./utils/inet_address')
const DataPacket = require('./protocol/data_packet')
const NACK = require('./protocol/nack')
const ACK = require('./protocol/ack')
const Reliability = require('./protocol/reliability')

'use strict'

class Connection {

    /** @type {EventEmitter} */
    #listener  
    /** @type {number} */
    #mtuSize
    /** @type {InetAddress} */
    #address

    // Queue containing sequence numbers of packets not received
    #nackQueue = []
    // Queue containing sequence numbers to let know the game packets we sent
    #ackQueue = []
    // Need documentation
    #recoveryQueue = []
    // Need documentation
    #packetToSend = []

    // Need documentation
    #windowStart = -1
    #windowEnd = 2048
    #reliableWindowStart = 0
    #reliableWindowEnd = 2048
    #reliableWindow = []
    #lastReliableIndex = -1

    // Array containing received sequence numbers
    #receivedWindow = []
    // Last received sequence number
    #lastSequenceNumber = -1

    // Last timestamp of packet received, helpful for timeout
    #lastPacketTime = Date.now()

    constructor(listener, mtuSize, address) {
        this.#listener = listener
        this.#mtuSize = mtuSize
        this.#address = address
        this.#listener.emit('test')  // it works!!
    }

    /**
     * Receive session packets
     * 
     * @param {Buffer} buffer 
     */
    receive(buffer) {
        let header = buffer.readUInt8()
        
        if ((header & BitFlags.Valid) == 0) {
            // Don't handle offline packets
            return
        } else if (header & BitFlags.Ack) {
            return this.handleACK(buffer)
        } else if (header & BitFlags.Nack) {
            return this.handleNACK(buffer)
        } else {
            return this.handleDatagram(buffer, header)
        }
    }

    handleDatagram(buffer, header) {
        this.#lastPacketTime = Date.now()

        let dataPacket = new DataPacket(header & BitFlags.Valid)
        dataPacket.buffer = buffer
        dataPacket.read()

        // Check if we already received packet and so we don't handle them
        // i still need to understand what are those window stuff
        if (
            dataPacket.sequenceNumber < this.#windowStart || 
            dataPacket.sequenceNumber > this.#windowEnd || 
            this.#receivedWindow.includes(dataPacket.sequenceNumber)
        ) {
            return
        }

        // Check if there are missing packets between the received packet and the last received one
        let diff = dataPacket.sequenceNumber - this.#lastSequenceNumber

        // Check if the packet was a missing one, so in the nack queue
        // if it was missing, remove from the queue because we received it now
        let index = this.#nackQueue.indexOf(dataPacket.sequenceNumber)
        if (index > -1) {
            this.#nackQueue.splice(index, 1)
        }

        // Add the packet to the 'sent' queue
        // to let know the game we sent the packet
        this.#ackQueue.push(dataPacket.sequenceNumber)

        // Add the packet to the received window, a property that keeps
        // all the sequence numbers of packets we received
        // its function is to check if when we lost some packets
        // check wich are really lost by searching if we received it there
        this.#receivedWindow.push(dataPacket.sequenceNumber)

        // Check if the sequence is broken due to a lost packet
        if (diff !== 1) {
            // As i said before, there we search for missing packets in the list of the recieved ones
            for (let i = this.#lastSequenceNumber + 1; i < dataPacket.sequenceNumber; i++) {
                // Adding the packet sequence number to the NACK queue and then sending a NACK
                // will make the Client sending again the lost packet
                if (!this.#receivedWindow.includes(i)) {
                    this.#nackQueue.push(i)
                }
            }
        }

        // If we received a lost packet we sent in NACK or a normal sequenced one
        // needs more documentation for window start and end
        if (diff >= 1) {
            this.#lastSequenceNumber = dataPacket.sequenceNumber
            this.#windowStart += diff
            this.#windowEnd += diff
        } 

        // Handle encapsulated
        this.receivePacket(dataPacket)
    }

    // Handles a ACK packet, this packet confirm that the other 
    // end successfully received the datagram
    handleACK(buffer) {
        let packet = new ACK()
        packet.buffer = buffer
        packet.read()

        console.log('ACK')
        console.log(packet.packets)

        for (let seq of packet.packets) {
            if (this.#recoveryQueue.includes(seq)) {
                for (let pk of this.#recoveryQueue[seq].packets) {
                    // Finish handling, remove the packet from ACKs
                }

                let index = this.#recoveryQueue.indexOf(seq)
                this.#recoveryQueue.splice(index, 1)
            }
        }
    }

    handleNACK(buffer) {
        let packet = new NACK()
        packet.buffer = buffer
        packet.read()

        console.log('NACK')
        console.log(packet.packets)

        for (let seq of packet.packets) {
            if (this.#recoveryQueue.includes(seq)) {
                let pk = this.#recoveryQueue[seq]
                pk.sequenceNumber = this.sequenceNumber++

                this.#packetToSend.push(pk)

                let index = this.#recoveryQueue.indexOf(seq)
                this.#recoveryQueue.splice(index, 1)
            }
        }
    }

    receivePacket(packet) {
        if (packet.reliability !== Reliability.ReliableOrdered ||
            typeof packet.messageIndex === 'undefined') {
            // Handle the packet directly if it is not a reliable ordered
            // or if it doesn't have a message index    
            this.handlePacket(packet)        
        } else {
            // Seems like we are checking the same stuff like before
            // but just with reliable packets
            if (
                packet.messageIndex < this.#reliableWindowStart ||
                packet.messageIndex > this.#reliableWindowEnd
            ) {
                return
            }

            if ((packet.messageIndex - this.#lastReliableIndex) === 1) {
                this.#lastReliableIndex++
                this.#reliableWindowStart++
                this.#reliableWindowEnd++
                this.handlePacket(packet)

                if (this.#reliableWindow.length > 0) {
                    // TODO: sort reliable window

                    for (let [seqIndex, pk] of this.#reliableWindow) {
                        if ((seqIndex - this.#lastReliableIndex) !== 1) {
                            break
                        }
                        this.#lastReliableIndex++
                        this.#reliableWindowStart++
                        this.#reliableWindowEnd++
                        this.handlePacket(pk)

                        let index = this.#reliableWindow.indexOf(index)
                        if (index > -1) {
                            this.#reliableWindow.splice(index, 1)
                        }
                    }
                }
            } else {
                this.#reliableWindow[packet.messageIndex] = packet
            }
        }
    }

    /**
     * Encapsulated handling route
     * 
     * @param {DataPacket} packet 
     */
    handlePacket(packet) {
        if (packet.split) {
            console.log('SPLIT')
            return
        }

        let id = packet.content.readUInt8()
        console.log(id)
    }
    
}
module.exports = Connection