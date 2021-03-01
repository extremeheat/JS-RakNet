const Identifiers = require('./Identifiers')
import InetAddress from '../utils/InetAddress';
import OfflinePacket from './OfflinePacket';

export default class OpenConnectionRequest2 extends OfflinePacket {
  public constructor(buffer?: Buffer) {
    super(Identifiers.OpenConnectionRequest2, buffer);
  }

  public serverAddress!: InetAddress;
  public mtuSize!: number;
  public clientGUID!: bigint;

  public decode(): void {
    super.decode()
    this.readMagic();
    this.serverAddress = this.readAddress();
    this.mtuSize = this.readShort();
    this.clientGUID = this.readLong();
  }

  public encode(): void {
    super.encode()
    this.writeMagic();
    this.writeAddress(this.serverAddress);
    this.writeShort(this.mtuSize);
    this.writeLong(this.clientGUID);
  }
}
