import { useState } from 'react'

/**
 * The Designs panel stays mounted after it is first shown: its OpenPencil page holds the edit it
 * has not written yet, and unmounting on a tab switch would drop it.
 */
export function useDesignsPanelRetained(shown: boolean): boolean {
  const [retained, setRetained] = useState(shown)
  if (shown && !retained) {
    setRetained(true)
  }
  return retained || shown
}
