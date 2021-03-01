import Packet from './Packet'
import EncapsulatedPacket from './EncapsulatedPacket'
import BitFlags from './bitflags'

export class DataPacket extends Packet {

  constructor() {
    super(BitFlags.Valid | 0)
  }

  packets = []

  // Packet sequence number
  // used to check for missing packets
  sequenceNumber: number

  decode() {
    super.decode()
    this.sequenceNumber = this.readLTriad()
    while (!this.feof()) {
      this.packets.push(EncapsulatedPacket.fromBinary(this))
    }
  }

  encode() {
    super.encode()
    this.writeLTriad(this.sequenceNumber)
    for (let packet of this.packets) {
      this.append(packet instanceof EncapsulatedPacket ? packet.toBinary() : packet.buffer)
    }
  }

  length() {
    let length = 4
    for (let packet of this.packets) {
      length += packet instanceof EncapsulatedPacket ? packet.getTotalLength() : packet.buffer.length
    }
    return length
  }

  static from(buffer) {
    const dataPacket = new DataPacket()
    dataPacket.buffer = buffer
    dataPacket.decode()
    return dataPacket
  }
}