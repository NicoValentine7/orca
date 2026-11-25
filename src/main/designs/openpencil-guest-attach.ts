import { OPENPENCIL_PARTITION, OPENPENCIL_START_URL } from '../../shared/designs/openpencil-host'

/**
 * will-attach-webview for the Designs panel: its partition only ever loads the bundled OpenPencil
 * app, with a pinned preload and no Node. Returns false when the attach must be refused.
 */
export function admitOpenPencilGuestAttach(
  webPreferences: Electron.WebPreferences,
  params: Record<string, string>,
  preload: string
): boolean {
  if (!(params.src ?? '').startsWith(OPENPENCIL_START_URL)) {
    return false
  }
  delete params.preload
  delete params.allowpopups
  delete (webPreferences as Record<string, unknown>).preloadURL
  delete webPreferences.additionalArguments
  Object.assign(webPreferences, {
    preload,
    partition: OPENPENCIL_PARTITION,
    nodeIntegration: false,
    nodeIntegrationInSubFrames: false,
    contextIsolation: true,
    sandbox: true,
    webSecurity: true,
    allowRunningInsecureContent: false,
    enableBlinkFeatures: '',
    disableBlinkFeatures: ''
  })
  return true
}

export function isOpenPencilPartition(partition: string): boolean {
  return partition === OPENPENCIL_PARTITION
}
