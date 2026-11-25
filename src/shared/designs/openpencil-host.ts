/** OpenPencil runs in its own persistent partition on a standard scheme so its storage and fonts survive restarts. */
export const OPENPENCIL_SCHEME = 'forca-openpencil'
export const OPENPENCIL_PARTITION = 'persist:forca-openpencil'
export const OPENPENCIL_START_URL = `${OPENPENCIL_SCHEME}://app/`

export const DESIGNS_FOLDER = 'designs'
export const DESIGN_FILE_EXTENSION = '.fig'
export const DESIGN_FILE_MAX_BYTES = 256 * 1024 * 1024

export const DESIGNS_CHANNELS = {
  list: 'designs:list',
  create: 'designs:create',
  bindGuest: 'designs:bindGuest',
  guestOpen: 'designs:guestOpen',
  guestWrite: 'designs:guestWrite'
} as const

export type DesignFileEntry = { name: string; size: number; modifiedAt: number }

export type DesignsFailureReason = 'no-worktree' | 'unsafe-name' | 'outside-designs' | 'exists'

export type DesignsListResult =
  | { ok: true; files: DesignFileEntry[] }
  | { ok: false; reason: DesignsFailureReason }

export type DesignsCreateResult =
  | { ok: true; name: string }
  | { ok: false; reason: DesignsFailureReason }

/** What the Designs panel shows in its OpenPencil guest: a designs/ file, or OpenPencil's own home. */
export type DesignsGuestTarget = { root: string; name: string } | null

/** A bare `<name>.fig` with no separators, dots-only segments or control characters. */
export function isDesignFileName(name: string): boolean {
  return (
    name.length > DESIGN_FILE_EXTENSION.length &&
    name.length <= 200 &&
    name.toLowerCase().endsWith(DESIGN_FILE_EXTENSION) &&
    !name.startsWith('.') &&
    !/[/\\:]/.test(name) &&
    ![...name].some((char) => char.charCodeAt(0) < 0x20)
  )
}
