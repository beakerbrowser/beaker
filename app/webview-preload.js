import { webFrame } from 'electron'
import importWebAPIs from './lib/fg/import-web-apis' // TODO remove
import DatArchive from './lib/web-apis/dat-archive'
import {DatUserProfile, DatUserProfileWritable} from './lib/web-apis/dat-user-profile'
import {UserSession, UserSessionWritable} from './lib/web-apis/user-session'
import beaker from './lib/web-apis/beaker'
import { setup as setupLocationbar } from './webview-preload/locationbar'
import { setup as setupNavigatorPermissions } from './webview-preload/navigator-permissions-api'
import { setup as setupPrompt } from './webview-preload/prompt'
import setupRedirectHackfix from './webview-preload/redirect-hackfix'

const BEAKER_ORIGIN_REGEX = /^beaker:/i
const DAT_ORIGIN_REGEX = /^(beaker:|dat:)/i
const SECURE_ORIGIN_REGEX = /^(beaker:|dat:|https:|http:\/\/localhost(\/|:))/i

// HACKS
setupRedirectHackfix()

// register protocol behaviors
/* This marks the scheme as:
 - Secure
 - Allowing Service Workers
 - Supporting Fetch API
 - CORS Enabled
*/
webFrame.registerURLSchemeAsPrivileged('dat', { bypassCSP: false })

// setup APIs
importWebAPIs()
if (SECURE_ORIGIN_REGEX.test(window.location)) {
  // beaker:, dat:, https:, and http://localhost only
  window.DatArchive = DatArchive
  if (BEAKER_ORIGIN_REGEX.test(window.location)) {
    // special writable form for beaker:
    window.DatUserProfile = DatUserProfileWritable
  } else {
    window.DatUserProfile = DatUserProfile
  }
}
if (DAT_ORIGIN_REGEX.test(window.location)) {
  // dat: and beaker: only
  if (BEAKER_ORIGIN_REGEX.test(window.location)) {
    // special writable form for beaker:
    window.UserSession = UserSessionWritable
  } else {
    window.UserSession = UserSession
  }
}
if (BEAKER_ORIGIN_REGEX.test(window.location)) {
  // beaker: only
  window.beaker = beaker
}
setupLocationbar()
setupNavigatorPermissions()
setupPrompt()
