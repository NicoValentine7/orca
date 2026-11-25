import { stat } from 'node:fs/promises'
import { extname, join, normalize, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { app, net, session } from 'electron'
import { OPENPENCIL_PARTITION, OPENPENCIL_SCHEME } from '../../shared/designs/openpencil-host'

/** Built by config/scripts/openpencil/build-openpencil.mjs; missing until that runs once. */
export function openPencilBuildDir(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'openpencil')
    : join(app.getAppPath(), 'resources', 'openpencil')
}

async function isFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile()
  } catch {
    return false
  }
}

async function handleOpenPencilRequest(request: Request): Promise<Response> {
  const root = openPencilBuildDir()
  const pathname = decodeURIComponent(new URL(request.url).pathname)
  const file = normalize(join(root, pathname))
  if (file !== root && !file.startsWith(root + sep)) {
    return new Response('Not found', { status: 404 })
  }
  if (await isFile(file)) {
    return net.fetch(pathToFileURL(file).toString())
  }
  // Client-side routes (no extension) load the app shell; a missing asset stays a 404.
  const shell = join(root, 'index.html')
  if (extname(pathname) === '' && (await isFile(shell))) {
    return net.fetch(pathToFileURL(shell).toString())
  }
  return new Response('OpenPencil is not built. Run pnpm openpencil:build.', {
    status: 404,
    headers: { 'content-type': 'text/plain; charset=utf-8' }
  })
}

export function installOpenPencilProtocolHandler(): void {
  const sess = session.fromPartition(OPENPENCIL_PARTITION)
  if (!sess.protocol.isProtocolHandled(OPENPENCIL_SCHEME)) {
    sess.protocol.handle(OPENPENCIL_SCHEME, handleOpenPencilRequest)
  }
}
