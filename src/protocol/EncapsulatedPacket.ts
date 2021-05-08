import BinaryStream from '@jsprismarine/jsbinaryutils';
import BitFlags from './bitflags';
import Reliability from './reliability';

export default class EncapsulatedPacket {
  // Decoded Encapsulated content
  buffer!: Buffer;

  // Packet reliability
  reliability: number

  // Reliable message number, used to identify reliable messages on the network
  messageIndex = 0

  // Identifier used with sequenced messages
  sequenceIndex = 0
  // Identifier used for ordering packets, included in sequenced messages
  orderIndex = 0;
  // The order channel the packet is on, used just if the reliability type has it
  orderChannel = 0

  split: boolean

  // If the packet is splitted, this is the count of splits
  splitCount = 0
  // If the packet is splitted, this ID refers to the index in the splits array
  splitIndex = 0
  // The ID of the split packet (if the packet is splitted)
  splitID = 0

  static fromBinary(stream): EncapsulatedPacket {
    let packet = new EncapsulatedPacket()
    let header = stream.readByte()
    packet.reliability = (header & 224) >> 5
    packet.split = (header & BitFlags.Split) > 0

    let length = stream.readShort()
    length >>= 3
    if (length == 0) {
      throw new Error('Got an empty encapsulated packet')
    }

    if (Reliability.isReliable(packet.reliability)) {
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

    packet.buffer = stream.buffer.slice(stream.offset, stream.offset + length)
    stream.offset += length

    return packet
  }

  toBinary() {
    let stream = new BinaryStream()
    let header = this.reliability << 5
    if (this.split) {
      header |= BitFlags.Split
    }
    stream.writeByte(header)
    stream.writeShort(this.buffer.length << 3)

    if (Reliability.isReliable(this.reliability)) {
      stream.writeLTriad(this.messageIndex)
    }

    if (Reliability.sequenced(this.reliability)) {
      stream.writeLTriad(this.sequenceIndex)
    }

    if (Reliability.sequencedOrOrdered(this.reliability)) {
      stream.writeLTriad(this.orderIndex)
      stream.writeByte(this.orderChannel)
    }

    if (this.split) {
      stream.writeInt(this.splitCount)
      stream.writeShort(this.splitID)
      stream.writeInt(this.splitIndex)
    }

    stream.append(this.buffer)
    return stream
  }

  getTotalLength() {
    return 3 + this.buffer.length +
      (typeof this.messageIndex !== 'undefined' ? 3 : 0) +
      (typeof this.orderIndex !== 'undefined' ? 4 : 0) +
      (this.split ? 10 : 0)
  }

  isReliable() {
    return Reliability.isReliable(this.reliability)
  }
}