// Builds the pinned OpenPencil web app with forca's Designs bridge into resources/openpencil.
// Needs git, git-lfs, bun and a Rust toolchain with the wasm32 target (rustup's cargo first on PATH).
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, rmSync } from 'node:fs'
import { homedir } from 'node:os'
import { delimiter, join, resolve } from 'node:path'

const OPENPENCIL_TAG = 'v0.17.0'
const OPENPENCIL_REPO = 'https://github.com/open-pencil/open-pencil.git'

const repoRoot = resolve(import.meta.dirname, '../../..')
const src = resolve(process.env.OPENPENCIL_SRC ?? join(repoRoot, '.cache/openpencil/src'))
const patch = join(repoRoot, 'config/scripts/openpencil/forca-designs-bridge.patch')
const out = join(repoRoot, 'resources/openpencil')
const env = {
  ...process.env,
  PATH: [join(homedir(), '.cargo/bin'), process.env.PATH].join(delimiter)
}

function run(command, args, cwd = src) {
  console.log(`$ ${command} ${args.join(' ')}`)
  execFileSync(command, args, { cwd, env, stdio: 'inherit' })
}

function succeeds(command, args) {
  try {
    execFileSync(command, args, { cwd: src, env, stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

if (!existsSync(src)) {
  run('git', ['clone', '--depth', '1', '--branch', OPENPENCIL_TAG, OPENPENCIL_REPO, src], repoRoot)
  run('git', ['lfs', 'pull'])
}
const tag = execFileSync('git', ['describe', '--tags', '--exact-match'], { cwd: src, env })
  .toString()
  .trim()
if (tag !== OPENPENCIL_TAG) {
  throw new Error(`${src} is at ${tag}, expected ${OPENPENCIL_TAG}`)
}
if (succeeds('git', ['apply', '--check', patch])) {
  run('git', ['apply', patch])
} else if (!succeeds('git', ['apply', '--reverse', '--check', patch])) {
  throw new Error(`${patch} applies neither forward nor in reverse to ${src}`)
}
run('bun', ['install'])
run('bun', ['run', 'build:packages'])
run('bunx', ['vite', 'build'])
rmSync(out, { recursive: true, force: true })
cpSync(join(src, 'dist'), out, { recursive: true })
console.log(`OpenPencil ${OPENPENCIL_TAG} built into ${out}`)
