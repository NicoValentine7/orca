import { useSyncExternalStore } from 'react'
import { useAppStore } from '@/store/index'
import { DESIGNS_FOLDER, isDesignFileName } from '../../../../../shared/designs/openpencil-host'

export type DesignOpenRequest = { worktreeId: string; name: string; at: number }

let pending: DesignOpenRequest | null = null
const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useDesignOpenRequest(): DesignOpenRequest | null {
  return useSyncExternalStore(subscribe, () => pending)
}

export function clearDesignOpenRequest(request: DesignOpenRequest): void {
  if (pending === request) {
    pending = null
    listeners.forEach((listener) => listener())
  }
}

/** The designs/ file name a worktree-relative path names, or null for anything else. */
export function designFileNameForRelativePath(relativePath: string): string | null {
  const [folder, name, ...rest] = relativePath.split(/[\\/]/)
  return folder === DESIGNS_FOLDER && name && rest.length === 0 && isDesignFileName(name)
    ? name
    : null
}

/** Shows the Designs panel with this designs/ file open. */
export function requestDesignOpen(worktreeId: string, name: string): void {
  pending = { worktreeId, name, at: Date.now() }
  listeners.forEach((listener) => listener())
  const state = useAppStore.getState()
  state.setRightSidebarTab('designs')
  state.setRightSidebarOpen(true)
}
