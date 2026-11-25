// フォークのビルドを、公式の Orca と並べて置ける別のアプリにする（ORCA_FORK_APP=1 のときだけ）。
// - バンドル ID と名前を変え、公式の Orca.app を上書きしない
// - パッケージ名を orca-fork にして、データの置き場を ~/Library/Application Support/orca-fork に分ける
//   （Electron は userData をパッケージ名から決める。公式の orca と同じだとプロファイルを奪い合う）
// - その名前を Resources/orca-app-identity.json にも置き、Orca の外から呼んだ CLI も同じ置き場を見るようにする
// - orca:// の URL は公式に任せる
// - アイコンを fOrca 用に変える
// - 出力を dist/fork.noindex に置き、Spotlight や Launchpad にビルドの .app が並ばないようにする
'use strict'

const FORK_APP_ID = 'com.nicovalentine.orca-fork'
const FORK_PRODUCT_NAME = 'fOrca'
// 置き場の名前の正本。CLI は同じファイルを Resources から読む（src/shared/app-lifecycle/packaged-user-data-dir-name.ts）
const FORK_IDENTITY_RESOURCE = 'resources/build/fork/orca-app-identity.json'
const FORK_PACKAGE_NAME = require('../resources/build/fork/orca-app-identity.json').userDataDirName
// 暗い緑とミントの色で、左上に f の札（fork/make-icon.swift で本家のアイコンから作る）
const FORK_MAC_ICON = 'resources/build/fork/icon.icns'

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
    directories: { ...config.directories, output: 'dist/fork.noindex' },
    mac: {
      ...config.mac,
      icon: FORK_MAC_ICON,
      extraResources: [
        ...(config.mac?.extraResources ?? []),
        { from: FORK_IDENTITY_RESOURCE, to: 'orca-app-identity.json' }
      ]
    }
  }
}

module.exports = { applyForkAppIdentity, FORK_APP_ID, FORK_PRODUCT_NAME, FORK_PACKAGE_NAME }
