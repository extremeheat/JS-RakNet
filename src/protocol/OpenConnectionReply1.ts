const Identifiers = require('./Identifiers')
import OfflinePacket from './OfflinePacket';

export default class OpenConnectionReply1 extends OfflinePacket {
  public constructor(buffer?: Buffer) {
    super(Identifiers.OpenConnectionReply1, buffer);
  }

  public serverGUID!: bigint;
  public mtuSize!: number;

  public decode(): void {
    super.decode()
    this.readMagic();
    this.serverGUID = this.readLong();
    this.readByte(); // Secure
    this.mtuSize = this.readShort();
  }

  public encode(): void {
    super.encode()
    this.writeMagic();
    this.writeLong(this.serverGUID);
    this.writeByte(0); // Secure
    this.writeShort(this.mtuSize);
  }
}
