import Packet from "./Packet"
import Identifiers from "./Identifiers"

export default class ConnectedPong extends Packet {
  constructor() {
    super(Identifiers.ConnectedPong)
  }

  clientTimestamp: bigint
  serverTimestamp: bigint

  encode() {
    super.encode()
    this.writeLong(this.clientTimestamp)
    this.writeLong(this.serverTimestamp)
  }

  decode() {
    super.decode()
    this.clientTimestamp = this.readLong()
    this.serverTimestamp = this.readLong()
  }

  static from(buffer) {
    const pak = new ConnectedPong()
    pak.buffer = buffer
    pak.decode()
    return pak
  }
}