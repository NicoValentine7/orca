import type { ContextBridge, IpcRenderer } from 'electron'
import {
  DESIGNS_CHANNELS,
  DESIGNS_GUEST_MESSAGES,
  type DesignsGuestTheme
} from '../shared/designs/openpencil-host'

// Raw require keeps the sandboxed preload standalone in the CJS build.
const electron: {
  contextBridge: ContextBridge
  ipcRenderer: Pick<IpcRenderer, 'invoke' | 'on' | 'sendToHost'>
} = require('electron')
const { contextBridge, ipcRenderer } = electron

// The theme can arrive before the page boots, so the latest one is kept for it.
let theme: DesignsGuestTheme | null = null
const themeListeners = new Set<(theme: DesignsGuestTheme) => void>()
let flushHandler: (() => Promise<void>) | null = null

function isGuestTheme(value: unknown): value is DesignsGuestTheme {
  return (
    typeof value === 'object' &&
    value !== null &&
    'colorScheme' in value &&
    (value.colorScheme === 'light' || value.colorScheme === 'dark') &&
    'tokens' in value &&
    typeof value.tokens === 'string'
  )
}

ipcRenderer.on(DESIGNS_GUEST_MESSAGES.theme, (_event, value: unknown) => {
  if (!isGuestTheme(value)) {
    return
  }
  theme = value
  for (const listener of themeListeners) {
    listener(value)
  }
})

ipcRenderer.on(DESIGNS_GUEST_MESSAGES.flush, async () => {
  try {
    await flushHandler?.()
  } finally {
    ipcRenderer.sendToHost(DESIGNS_GUEST_MESSAGES.flushed)
  }
})

// The page never names a path: main answers with whatever designs/ file the panel bound it to.
contextBridge.exposeInMainWorld('forcaDesigns', {
  open: (): Promise<{ name: string; bytes: Uint8Array } | null> =>
    ipcRenderer.invoke(DESIGNS_CHANNELS.guestOpen),
  write: (bytes: Uint8Array): Promise<void> => {
    if (!(bytes instanceof Uint8Array)) {
      return Promise.reject(new TypeError('bytes must be a Uint8Array'))
    }
    return ipcRenderer.invoke(DESIGNS_CHANNELS.guestWrite, bytes)
  },
  theme: (): DesignsGuestTheme | null => theme,
  onTheme: (listener: (theme: DesignsGuestTheme) => void): void => {
    themeListeners.add(listener)
  },
  onFlush: (handler: () => Promise<void>): void => {
    flushHandler = handler
  }
})
