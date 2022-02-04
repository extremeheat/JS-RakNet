import InetAddress from "../utils/InetAddress"
import Packet from './Packet'
import Identifiers from './Identifiers'
import ConnectionRequest from "./ConnectionRequest"

export default class ConnectionRequestAccepted extends Packet {
  constructor() {
    super(Identifiers.ConnectionRequestAccepted)
  }

  clientAddress: InetAddress
  requestTimestamp: bigint
  acceptedTimestamp: bigint

  decode() {
    super.decode()
    this.clientAddress = this.readAddress()
    const addressIndex = this.readShort()  // unknown

    for (let i = 0; i < 20; i++) {
      const address = this.readAddress()
      if (this.reaminingBytes === 16) break
    }

    this.requestTimestamp = this.readLong()
    this.acceptedTimestamp = this.readLong()
  }

  encode() {
    super.encode()
    this.writeAddress(this.clientAddress)
    this.writeShort(0)  // unknown
    let sysAddresses = [new InetAddress('127.0.0.1', 0, 4)]
    for (let i = 0; i < 20; i++) {
      this.writeAddress(sysAddresses[i] || new InetAddress('0.0.0.0', 0, 4))
    }
    this.writeLong(this.requestTimestamp)
    this.writeLong(this.acceptedTimestamp)
  }

  static from(buffer) {
    const pak = new ConnectionRequest()
    pak.buffer = buffer
    pak.decode()
    return pak
  }
}