import type { ContextBridge, IpcRenderer } from 'electron'
import { DESIGNS_CHANNELS } from '../shared/designs/openpencil-host'

// Raw require keeps the sandboxed preload standalone in the CJS build.
const electron: {
  contextBridge: ContextBridge
  ipcRenderer: Pick<IpcRenderer, 'invoke'>
} = require('electron')
const { contextBridge, ipcRenderer } = electron

// The page never names a path: main answers with whatever designs/ file the panel bound it to.
contextBridge.exposeInMainWorld('forcaDesigns', {
  open: (): Promise<{ name: string; bytes: Uint8Array } | null> =>
    ipcRenderer.invoke(DESIGNS_CHANNELS.guestOpen),
  write: (bytes: Uint8Array): Promise<void> => {
    if (!(bytes instanceof Uint8Array)) {
      return Promise.reject(new TypeError('bytes must be a Uint8Array'))
    }
    return ipcRenderer.invoke(DESIGNS_CHANNELS.guestWrite, bytes)
  }
})
