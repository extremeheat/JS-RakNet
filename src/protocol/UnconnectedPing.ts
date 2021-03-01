const Identifiers = require('./Identifiers')
import OfflinePacket from './OfflinePacket';

export default class UnconnectedPing extends OfflinePacket {
  public constructor(buffer?: Buffer) {
    super(Identifiers.UnconnectedPing, buffer);
  }

  public sendTimestamp!: bigint;
  public clientGUID!: bigint;

  public decode() {
    super.decode()
    this.sendTimestamp = this.readLong();
    this.readMagic();
    this.clientGUID = this.readLong();
  }

  public encode() {
    super.encode()
    this.writeLong(this.sendTimestamp);
    this.writeMagic();
    this.writeLong(this.clientGUID);
  }
}
