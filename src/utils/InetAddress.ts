export default class InetAddress {
  address: string; port: number; version: number; hash: string;
  constructor(address, port, version = 4) {
    this.address = address
    this.port = port
    this.version = version
    this.hash = address + '/' + port
  }
}