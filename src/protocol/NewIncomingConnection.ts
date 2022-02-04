import InetAddress from "../utils/InetAddress"
import Packet from "./Packet"
const Identifiers = require('./Identifiers')

export default class NewIncomingConnection extends Packet {

  constructor() {
    super(Identifiers.NewIncomingConnection)
  }

  address: InetAddress
  systemAddresses: InetAddress[] = new Array(20).fill(new InetAddress('0.0.0.0', 0, 4))

  requestTimestamp
  acceptedTimestamp

  decode() {
    super.decode()
    this.address = this.readAddress()

    // Do not save in memory stuff we will not use
    for (let i = 0; i < 20; i++) {
      const address = this.readAddress()
      this.systemAddresses.push(address)
      if (this.reaminingBytes === 16) break
    }

    this.requestTimestamp = this.readLong()
    this.acceptedTimestamp = this.readLong()
  }

  encode() {
    super.encode()
    this.writeAddress(this.address)
    for (let i = 0; i < 20; i++) {
      this.writeAddress(this.systemAddresses[i])
    }
    this.writeLong(this.requestTimestamp)
    this.writeLong(this.acceptedTimestamp)
  }

  static from(buffer) {
    const e = new NewIncomingConnection()
    e.buffer = buffer
    e.decode()
    return e
  }
}