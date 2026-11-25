import { useSyncExternalStore } from 'react'

// Not saved: a restart opens the panel at the width the person last dragged it to.
let expanded = false
const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Whether the Designs panel fills the window beside the left sidebar instead of its own width. */
export function useDesignsExpanded(): boolean {
  return useSyncExternalStore(subscribe, () => expanded)
}

export function setDesignsExpanded(next: boolean): void {
  if (expanded !== next) {
    expanded = next
    listeners.forEach((listener) => listener())
  }
}
