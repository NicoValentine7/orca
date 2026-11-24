import { app } from 'electron'

// Fork builds carry "-local." in their version; an official update would drop the fork's changes.
export function isUpdaterAvailable(): boolean {
  return app.isPackaged && !app.getVersion().includes('-local.')
}
