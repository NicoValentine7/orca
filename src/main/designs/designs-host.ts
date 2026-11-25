import { registerDesignsHandlers } from './designs-ipc'
import { installOpenPencilProtocolHandler } from './openpencil-protocol'

/** The Designs panel's OpenPencil pages and its designs/ file access. */
export function installDesignsHost(): void {
  installOpenPencilProtocolHandler()
  registerDesignsHandlers()
}
