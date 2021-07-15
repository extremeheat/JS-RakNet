const Identifiers = require('./Identifiers')
import OfflinePacket from './OfflinePacket';

export default class OpenConnectionRequest1 extends OfflinePacket {
  public constructor(buffer?: Buffer) {
    super(Identifiers.OpenConnectionRequest1, buffer);
  }

  public mtuSize: number;
  public protocol: number;

  public decode(): void {
    super.decode()
    this.mtuSize = Buffer.byteLength(this.getBuffer()) + 28;
    this.readMagic();
    this.protocol = this.readByte();
  }

  public encode(): void {
    super.encode()
    this.writeMagic();
    this.writeByte(this.protocol);
    const length = this.mtuSize - this.getBuffer().byteLength - 1
    const buf = Buffer.alloc(length).fill(0x00)
    this.append(buf);
  }
}