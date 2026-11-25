import { lstat, mkdir, readdir, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { isAbsolute, join, sep } from 'node:path'
import {
  DESIGN_FILE_MAX_BYTES,
  DESIGNS_FOLDER,
  isDesignFileName,
  type DesignFileEntry
} from '../../shared/designs/openpencil-host'

export class DesignsFolderError extends Error {
  constructor(readonly reason: 'no-worktree' | 'unsafe-name' | 'outside-designs' | 'exists') {
    super(`designs folder refused: ${reason}`)
  }
}

function errorCode(error: unknown): string | undefined {
  return error instanceof Error && 'code' in error && typeof error.code === 'string'
    ? error.code
    : undefined
}

function isMissing(error: unknown): boolean {
  return errorCode(error) === 'ENOENT'
}

/** The real designs/ directory directly under `root`; null when it does not exist yet. */
async function resolveDesignsDir(root: string, create: boolean): Promise<string | null> {
  if (!isAbsolute(root)) {
    throw new DesignsFolderError('no-worktree')
  }
  let realRoot: string
  try {
    realRoot = await realpath(root)
  } catch (error) {
    if (isMissing(error)) {
      throw new DesignsFolderError('no-worktree')
    }
    throw error
  }
  const expected = join(realRoot, DESIGNS_FOLDER)
  try {
    const info = await lstat(expected)
    if (info.isSymbolicLink() || !info.isDirectory()) {
      throw new DesignsFolderError('outside-designs')
    }
  } catch (error) {
    if (!isMissing(error)) {
      throw error
    }
    if (!create) {
      return null
    }
    await mkdir(expected)
  }
  return expected
}

/** Refuses any name that could reach outside designs/, including a symlink planted inside it. */
async function resolveDesignFile(dir: string, name: string): Promise<string> {
  if (!isDesignFileName(name)) {
    throw new DesignsFolderError('unsafe-name')
  }
  const path = join(dir, name)
  try {
    const info = await lstat(path)
    if (info.isSymbolicLink() || !info.isFile()) {
      throw new DesignsFolderError('outside-designs')
    }
    if (!(await realpath(path)).startsWith(dir + sep)) {
      throw new DesignsFolderError('outside-designs')
    }
  } catch (error) {
    if (!isMissing(error)) {
      throw error
    }
  }
  return path
}

export async function listDesignFiles(root: string): Promise<DesignFileEntry[]> {
  const dir = await resolveDesignsDir(root, false)
  if (!dir) {
    return []
  }
  const files: DesignFileEntry[] = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !isDesignFileName(entry.name)) {
      continue
    }
    const info = await lstat(join(dir, entry.name))
    files.push({ name: entry.name, size: info.size, modifiedAt: info.mtimeMs })
  }
  return files.sort((a, b) => a.name.localeCompare(b.name))
}

export async function readDesignFile(root: string, name: string): Promise<Uint8Array> {
  const dir = await resolveDesignsDir(root, false)
  if (!dir) {
    throw new DesignsFolderError('outside-designs')
  }
  const path = await resolveDesignFile(dir, name)
  const info = await lstat(path)
  if (info.size > DESIGN_FILE_MAX_BYTES) {
    throw new DesignsFolderError('outside-designs')
  }
  return new Uint8Array(await readFile(path))
}

/** Writes through a sibling temp file and a rename, so a crash never leaves a half-written design. */
export async function writeDesignFile(
  root: string,
  name: string,
  bytes: Uint8Array
): Promise<void> {
  if (bytes.byteLength > DESIGN_FILE_MAX_BYTES) {
    throw new DesignsFolderError('outside-designs')
  }
  const dir = await resolveDesignsDir(root, true)
  if (!dir) {
    throw new DesignsFolderError('outside-designs')
  }
  const path = await resolveDesignFile(dir, name)
  const temp = join(dir, `.${name}.${randomUUID()}.tmp`)
  try {
    await writeFile(temp, bytes, { flag: 'wx' })
    await rename(temp, path)
  } catch (error) {
    await rm(temp, { force: true })
    throw error
  }
}

export async function createDesignFile(root: string, name: string): Promise<void> {
  const dir = await resolveDesignsDir(root, true)
  if (!dir) {
    throw new DesignsFolderError('outside-designs')
  }
  const path = await resolveDesignFile(dir, name)
  try {
    await writeFile(path, new Uint8Array(), { flag: 'wx' })
  } catch (error) {
    if (errorCode(error) === 'EEXIST') {
      throw new DesignsFolderError('exists')
    }
    throw error
  }
}
