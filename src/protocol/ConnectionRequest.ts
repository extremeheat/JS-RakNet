import Packet from './Packet'
import Identifiers from './Identifiers'

export default class ConnectionRequest extends Packet {
  constructor() {
    super(Identifiers.ConnectionRequest)
  }

  clientGUID: bigint
  requestTimestamp: bigint

  decode() {
    super.decode()
    this.clientGUID = this.readLong()
    this.requestTimestamp = this.readLong()
    this.readByte()  // secure
  }

  encode() {
    super.encode()
    this.writeLong(this.clientGUID)
    this.writeLong(this.requestTimestamp)
    this.writeByte(0)  // secure
  }

  static from(buffer: Buffer) {
    const pak = new ConnectionRequest()
    pak.buffer = buffer
    pak.decode()
    return pak
  }
}