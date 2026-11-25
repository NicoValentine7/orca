import { OPENPENCIL_SCHEME } from '../../shared/designs/openpencil-host'

/** Declared before app ready, as Electron freezes scheme privileges then; kept apart from the handler. */
export const OPENPENCIL_CUSTOM_SCHEME: Electron.CustomScheme = {
  scheme: OPENPENCIL_SCHEME,
  privileges: {
    standard: true,
    secure: true,
    supportFetchAPI: true,
    corsEnabled: true,
    stream: true
  }
}
