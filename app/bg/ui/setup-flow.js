import * as path from 'path'
import { URLSearchParams } from 'url'
import { BrowserWindow } from 'electron'
import { ICON_PATH } from './windows'
import * as profileDb from '../dbs/profile-data-db'
import * as filesystem from '../filesystem/index'
import knex from '../lib/knex'

// globals
// =

var setupWindow

// exported api
// =

export var hasVisitedProfile = false

export async function runSetupFlow () {
  var setupState = await profileDb.get('SELECT * FROM setup_state')
  if (!setupState) {
    setupState = {migrated08to09: 0, profileSetup: 0, hasVisitedProfile: 0}
    await profileDb.run(knex('setup_state').insert(setupState))
  }
  hasVisitedProfile = setupState.hasVisitedProfile === 1

  // TODO
  // do we even need to track profileSetup in setup_state?
  // might be better to just use the address-book.json state
  // -prf
  var hasProfile = !!(await filesystem.getProfile())
  if (setupState.profileSetup && !hasProfile) {
    setupState.profileSetup = 0
    await profileDb.run(knex('setup_state').update(setupState))
  } else if (!setupState.profileSetup && hasProfile) {
    setupState.profileSetup = 1
    await profileDb.run(knex('setup_state').update(setupState))
  }

  var needsSetup = !setupState.profileSetup || !setupState.migrated08to09
  if (needsSetup) {
    setupWindow = new BrowserWindow({
      // titleBarStyle: 'hiddenInset',
      autoHideMenuBar: true,
      fullscreenable: false,
      resizable: false,
      fullscreenWindowTitle: true,
      frame: false,
      width: 600,
      height: 500,
      backgroundColor: '#334',
      webPreferences: {
        preload: path.join(__dirname, 'fg', 'webview-preload', 'index.build.js'),
        defaultEncoding: 'utf-8',
        nodeIntegration: false,
        contextIsolation: true,
        webviewTag: false,
        sandbox: true,
        webSecurity: true,
        enableRemoteModule: false,
        allowRunningInsecureContent: false
      },
      icon: ICON_PATH,
      show: true
    })
    setupWindow.loadURL(`beaker://setup/?${(new URLSearchParams(setupState)).toString()}`)
    await new Promise(r => setupWindow.once('close', r))
    setupWindow = undefined
  }
}

export async function updateSetupState (obj) {
  await profileDb.run(knex('setup_state').update(obj))

  // HACK
  // window.close() isnt working within the UI thread for some reason
  // so use this as a cue to close the window
  // -prf
  var setupState = await profileDb.get('SELECT * FROM setup_state')
  if (setupWindow && setupState.profileSetup && setupState.migrated08to09) setupWindow.close()
}

export async function setHasVisitedProfile () {
  hasVisitedProfile = true
  await profileDb.run(knex('setup_state').update({hasVisitedProfile: 1}))
}