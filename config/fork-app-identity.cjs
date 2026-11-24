// フォークのビルドを、公式の Orca と並べて置ける別のアプリにする（ORCA_FORK_APP=1 のときだけ）。
// - バンドル ID と名前を変え、公式の Orca.app を上書きしない
// - パッケージ名を orca-fork にして、データの置き場を ~/Library/Application Support/orca-fork に分ける
//   （Electron は userData をパッケージ名から決める。公式の orca と同じだとプロファイルを奪い合う）
// - orca:// の URL は公式に任せる
// - 出力を dist/fork.noindex に置き、Spotlight や Launchpad にビルドの .app が並ばないようにする
'use strict'

const FORK_APP_ID = 'com.nicovalentine.orca-fork'
const FORK_PRODUCT_NAME = 'Orca Fork'
const FORK_PACKAGE_NAME = 'orca-fork'

/** @param {import('electron-builder').Configuration} config */
function applyForkAppIdentity(config, env = process.env) {
  if (env.ORCA_FORK_APP !== '1') {
    return config
  }
  return {
    ...config,
    appId: FORK_APP_ID,
    productName: FORK_PRODUCT_NAME,
    protocols: [],
    extraMetadata: { ...config.extraMetadata, name: FORK_PACKAGE_NAME },
    publish: null,
    directories: { ...config.directories, output: 'dist/fork.noindex' }
  }
}

module.exports = { applyForkAppIdentity, FORK_APP_ID, FORK_PRODUCT_NAME, FORK_PACKAGE_NAME }
