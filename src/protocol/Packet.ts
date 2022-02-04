import BinaryStream from '@jsprismarine/jsbinaryutils'
import InetAddress from '../utils/InetAddress'

// Basic class template
// @ts-ignore
export default class Packet extends BinaryStream {
  // TODO: Expose these
  public buffer: Buffer
  public offset: number

  // The ID of the packet
  id: number

  constructor(id, buffer?: Buffer) {
    super(buffer)
    this.id = id
  }

  get reaminingBytes() {
    return this.buffer.byteLength - this.offset
  }

  // Decodes packet buffer
  decode() {
    this.readByte()  // Skip the packet ID
  }

  // Encodes packet buffer
  encode() {
    this.writeByte(this.id)
  }

  // Reads a string from the buffer
  readString(): string {
    return this.read(this.readShort()).toString()
  }

  // Writes a string length + buffer 
  // valid only for offline packets
  writeString(v: string) {
    this.writeShort(Buffer.byteLength(v))
    this.append(Buffer.from(v, 'utf-8'))
  }

  // Reads a RakNet address passed into the buffer 
  readAddress() {
    let ver = this.readByte()
    if (ver == 4) {
      // Read 4 bytes 
      let ipBytes = this.buffer.slice(this.offset, this.addOffset(4, true))
      const decoded = ~ipBytes
      const hostname = `${(decoded >> 24) & 0xff}.${(decoded >> 16) & 0xff}.${(decoded >> 8) & 0xff}.${decoded & 0xff}`
      let port = this.readShort()
      return new InetAddress(hostname, port, ver)
    } else {
      this.offset += 2 // Skip 2 bytes, AF
      let port = this.readShort()
      this.offset += 4 // Skip 4 bytes, flow
      let addr = this.buffer.slice(this.offset, this.offset += 16)
      this.offset += 4  // Skip 4 bytes, scope ID
      return new InetAddress(addr, port, ver)
    }
  }

  // Writes an IPv4 address into the buffer
  // Needs to get refactored, also needs to be added support for IPv6
  writeAddress(address) {
    this.writeByte(address.version || 4)
    address.address.split('.', 4).forEach(b => this.writeByte(-b - 1))
    this.writeShort(address.port)
  }
}