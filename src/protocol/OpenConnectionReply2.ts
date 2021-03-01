const Identifiers = require('./Identifiers')
import InetAddress from '../utils/InetAddress';
import OfflinePacket from './OfflinePacket';

export default class OpenConnectionReply2 extends OfflinePacket {
  public constructor(buffer?: Buffer) {
    super(Identifiers.OpenConnectionReply2, buffer);
  }

  public serverGUID!: bigint;
  public clientAddress!: InetAddress;
  public mtuSize!: number;

  public decode(): void {
    super.decode()
    this.readMagic();
    this.serverGUID = this.readLong();
    this.clientAddress = this.readAddress();
    this.mtuSize = this.readShort();
    this.readByte(); // Secure
  }

  public encode(): void {
    super.encode()
    this.writeMagic();
    this.writeLong(this.serverGUID);
    this.writeAddress(this.clientAddress);
    this.writeShort(this.mtuSize);
    this.writeByte(0); // Secure
  }
}
