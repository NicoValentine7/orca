import type {
  DesignsCreateResult,
  DesignsListResult
} from '../../../shared/designs/openpencil-host'

/** The Designs panel's reads of a local worktree's designs/ folder; see main/designs/designs-ipc.ts. */
export type DesignsApi = {
  list: (args: { root: string }) => Promise<DesignsListResult>
  create: (args: { root: string; name: string }) => Promise<DesignsCreateResult>
  /** Points an OpenPencil webview at a designs/ file, or at OpenPencil's own home with null. */
  bindGuest: (args: {
    guestId: number
    target: { root: string; name: string } | null
  }) => Promise<boolean>
}
