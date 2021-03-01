import Packet from "./Packet"
import Identifiers from "./Identifiers"

export default class ConnectedPing extends Packet {
  constructor() {
    super(Identifiers.ConnectedPing)
  }

  clientTimestamp: bigint

  decode() {
    super.decode()
    this.clientTimestamp = this.readLong()
  }

  encode() {
    super.encode()
    this.writeLong(this.clientTimestamp)
  }
}