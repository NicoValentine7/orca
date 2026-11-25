import { ipcRenderer } from 'electron'
import { DESIGNS_CHANNELS } from '../../../shared/designs/openpencil-host'
import type { PreloadApi } from '../../api-types'

export const designsApi = {
  list: (args) => ipcRenderer.invoke(DESIGNS_CHANNELS.list, args),
  create: (args) => ipcRenderer.invoke(DESIGNS_CHANNELS.create, args),
  bindGuest: (args) => ipcRenderer.invoke(DESIGNS_CHANNELS.bindGuest, args)
} satisfies PreloadApi['designs']
