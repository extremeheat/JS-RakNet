import AcknowledgePacket from './AcknowledgePacket'
const Identifiers = require('./Identifiers')

export default class ACK extends AcknowledgePacket {
  constructor() {
    // @ts-ignore
    super(Identifiers.AcknowledgePacket)
  }
}