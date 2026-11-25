import { readFileSync } from 'node:fs'
import { join, sep } from 'node:path'

const DEFAULT_USER_DATA_DIR_NAME = 'orca'
// A renamed build (config/fork-app-identity.cjs) writes this into <Resources>; absent in official builds.
export const APP_IDENTITY_RESOURCE = 'orca-app-identity.json'

let cachedFor: string | undefined
let cachedName = DEFAULT_USER_DATA_DIR_NAME

/** userData folder name of the app this script ships in, so a renamed build keeps to its own profile. */
export function packagedUserDataDirName(scriptPath = process.argv[1] ?? ''): string {
  if (scriptPath === cachedFor) {
    return cachedName
  }
  const unpacked = scriptPath.indexOf(`${sep}app.asar.unpacked${sep}`)
  cachedName =
    unpacked === -1
      ? DEFAULT_USER_DATA_DIR_NAME
      : readIdentityDirName(join(scriptPath.slice(0, unpacked), APP_IDENTITY_RESOURCE))
  cachedFor = scriptPath
  return cachedName
}

function readIdentityDirName(file: string): string {
  let raw: string
  try {
    raw = readFileSync(file, 'utf8')
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return DEFAULT_USER_DATA_DIR_NAME
    }
    throw error
  }
  // Falling back here would silently point a renamed build at the official app's profile.
  const parsed: unknown = JSON.parse(raw)
  const name =
    typeof parsed === 'object' && parsed !== null && 'userDataDirName' in parsed
      ? parsed.userDataDirName
      : undefined
  if (typeof name !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name)) {
    throw new Error(`Invalid userDataDirName in ${file}`)
  }
  return name
}
