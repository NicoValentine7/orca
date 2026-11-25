import { ipcMain, session, webContents } from 'electron'
import { z } from 'zod'
import {
  DESIGN_FILE_MAX_BYTES,
  DESIGNS_CHANNELS,
  OPENPENCIL_PARTITION,
  type DesignsCreateResult,
  type DesignsGuestTarget,
  type DesignsListResult
} from '../../shared/designs/openpencil-host'
import {
  createDesignFile,
  DesignsFolderError,
  listDesignFiles,
  readDesignFile,
  writeDesignFile
} from './designs-folder'

const RootArgs = z.object({ root: z.string().min(1).max(4096) })
const FileArgs = RootArgs.extend({ name: z.string().min(1).max(200) })
const BindArgs = z.object({ guestId: z.number().int().positive(), target: FileArgs.nullable() })

// Why main keeps the target: OpenPencil loads web content, so its guest never names a path itself.
const targetByGuest = new Map<number, DesignsGuestTarget>()
const bindWaiters = new Map<number, () => void>()
const BIND_WAIT_MS = 10_000

/** The page can boot before its host binds it, so the first open waits for the binding. */
async function waitForBinding(guestId: number): Promise<void> {
  if (targetByGuest.has(guestId)) {
    return
  }
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      bindWaiters.delete(guestId)
      resolve()
    }, BIND_WAIT_MS)
    bindWaiters.set(guestId, () => {
      clearTimeout(timer)
      bindWaiters.delete(guestId)
      resolve()
    })
  })
}

function failure(error: unknown): { ok: false; reason: DesignsFolderError['reason'] } {
  if (error instanceof DesignsFolderError) {
    return { ok: false, reason: error.reason }
  }
  throw error
}

function isOpenPencilWebview(guest: Electron.WebContents): boolean {
  return (
    guest.getType() === 'webview' && guest.session === session.fromPartition(OPENPENCIL_PARTITION)
  )
}

function boundTarget(sender: Electron.WebContents): DesignsGuestTarget | undefined {
  return isOpenPencilWebview(sender) ? targetByGuest.get(sender.id) : undefined
}

export function registerDesignsHandlers(): void {
  ipcMain.handle(DESIGNS_CHANNELS.list, async (_event, args): Promise<DesignsListResult> => {
    const { root } = RootArgs.parse(args)
    try {
      return { ok: true, files: await listDesignFiles(root) }
    } catch (error) {
      return failure(error)
    }
  })

  ipcMain.handle(DESIGNS_CHANNELS.create, async (_event, args): Promise<DesignsCreateResult> => {
    const { root, name } = FileArgs.parse(args)
    try {
      await createDesignFile(root, name)
      return { ok: true, name }
    } catch (error) {
      return failure(error)
    }
  })

  ipcMain.handle(DESIGNS_CHANNELS.bindGuest, (event, args): boolean => {
    const { guestId, target } = BindArgs.parse(args)
    const guest = webContents.fromId(guestId)
    // Only the window hosting an OpenPencil webview may point it at a file.
    if (!guest || !isOpenPencilWebview(guest) || guest.hostWebContents?.id !== event.sender.id) {
      return false
    }
    if (!targetByGuest.has(guestId)) {
      guest.once('destroyed', () => targetByGuest.delete(guestId))
    }
    targetByGuest.set(guestId, target)
    bindWaiters.get(guestId)?.()
    return true
  })

  ipcMain.handle(DESIGNS_CHANNELS.guestOpen, async (event) => {
    if (!isOpenPencilWebview(event.sender)) {
      return null
    }
    await waitForBinding(event.sender.id)
    const target = boundTarget(event.sender)
    if (!target) {
      return null
    }
    return { name: target.name, bytes: await readDesignFile(target.root, target.name) }
  })

  ipcMain.handle(DESIGNS_CHANNELS.guestWrite, async (event, bytes: unknown) => {
    const target = boundTarget(event.sender)
    if (!target) {
      throw new Error('no design is open in this guest')
    }
    if (!(bytes instanceof Uint8Array) || bytes.byteLength > DESIGN_FILE_MAX_BYTES) {
      throw new Error('design bytes refused')
    }
    await writeDesignFile(target.root, target.name, bytes)
  })
}
