const Identifiers = require('./Identifiers')
import OfflinePacket from './OfflinePacket';

export default class IncompatibleProtocolVersion extends OfflinePacket {
  public constructor() {
    super(Identifiers.IncompatibleProtocolVersion);
  }

  public protocol: number;
  public serverGUID: bigint;

  public encode(): void {
    super.encode()
    this.writeByte(this.protocol);
    this.writeMagic();
    this.writeLong(this.serverGUID);
  }

  public decode(): void {
    super.decode()
    this.protocol = this.readByte();
    this.readMagic();
    this.serverGUID = this.readLong();
  }
}
