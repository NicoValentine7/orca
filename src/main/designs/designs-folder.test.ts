import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createDesignFile,
  listDesignFiles,
  readDesignFile,
  writeDesignFile
} from './designs-folder'

let base: string
let root: string
let outside: string

beforeEach(async () => {
  base = await mkdtemp(join(tmpdir(), 'designs-folder-'))
  root = join(base, 'worktree')
  outside = join(base, 'outside')
  await mkdir(root)
  await mkdir(outside)
})

afterEach(async () => {
  await rm(base, { recursive: true, force: true })
})

describe('designs folder boundary', () => {
  it('reads and writes only bare .fig names inside designs/', async () => {
    await writeDesignFile(root, 'screen.fig', new Uint8Array([1, 2, 3]))
    expect([...(await readDesignFile(root, 'screen.fig'))]).toEqual([1, 2, 3])
    expect((await listDesignFiles(root)).map((file) => file.name)).toEqual(['screen.fig'])

    for (const name of ['../escape.fig', 'nested/a.fig', 'a\\b.fig', 'notes.txt', '.hidden.fig']) {
      await expect(writeDesignFile(root, name, new Uint8Array([9]))).rejects.toMatchObject({
        reason: 'unsafe-name'
      })
    }
    await expect(readFile(join(base, 'escape.fig'))).rejects.toThrow()
  })

  it('refuses a design that is a symlink to a file outside', async () => {
    await writeFile(join(outside, 'secret.fig'), 'secret')
    await mkdir(join(root, 'designs'))
    await symlink(join(outside, 'secret.fig'), join(root, 'designs', 'link.fig'))

    await expect(readDesignFile(root, 'link.fig')).rejects.toMatchObject({
      reason: 'outside-designs'
    })
    await expect(writeDesignFile(root, 'link.fig', new Uint8Array([9]))).rejects.toMatchObject({
      reason: 'outside-designs'
    })
    expect(await readFile(join(outside, 'secret.fig'), 'utf8')).toBe('secret')
  })

  it('refuses a designs/ folder that is a symlink out of the worktree', async () => {
    await symlink(outside, join(root, 'designs'))

    await expect(createDesignFile(root, 'new.fig')).rejects.toMatchObject({
      reason: 'outside-designs'
    })
    await expect(listDesignFiles(root)).rejects.toMatchObject({ reason: 'outside-designs' })
  })

  it('never overwrites an existing design when creating one', async () => {
    await writeDesignFile(root, 'kept.fig', new Uint8Array([7]))
    await expect(createDesignFile(root, 'kept.fig')).rejects.toMatchObject({ reason: 'exists' })
    expect([...(await readDesignFile(root, 'kept.fig'))]).toEqual([7])
  })
})
