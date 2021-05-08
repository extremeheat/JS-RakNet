'use strict'

class InetAddress {
    constructor(address, port, version = 4) {
        this.address = address
        this.port = port
        this.version = version
        this.hash = address + '/' + port
    }
}
module.exports = InetAddress