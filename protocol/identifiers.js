'use strict'

// Identifiers used to identify incoming packets
const Identifiers = {

    UnconnectedPing: 0x01,
    UnconnectedPong: 0x1c,
    OpenConnectionRequest1: 0x05,
    OpenConnectionReply1: 0x06,
    OpenConnectionRequest2: 0x07,
    OpenConnectionReply2: 0x08,
    IncompatibleProtocolVersion: 0x19
    
}
module.exports = Identifiers