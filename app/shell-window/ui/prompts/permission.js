import { remote, ipcRenderer } from 'electron'
import * as yo from 'yo-yo'
import * as promptbar from '../promptbar'
import * as pages from '../../pages'

// constants
// =

const PERM_DESCS = {
  media: 'use your camera and microphone',
  geolocation: 'know your location',
  notifications: 'create desktop notifications',
  midiSysex: 'access your MIDI devices',
  pointerLock: 'lock your cursor',
  fullscreen: 'go fullscreen',
  openExternal: 'open this URL in another program: '
}

// exported api
// =

export default function (reqId, webContentsId, permission) {
  const respond = decision => ipcRenderer.send('permission-response', reqId, decision)

  // look up the page, deny if failed
  var page = pages.getByWebContents(remote.webContents.fromId(webContentsId))
  if (!page)
    return respond(false)

  // lookup the perm description. auto-deny if it's not a known perm.
  var permDesc = PERM_DESCS[permission]
  if (!permDesc)
    return respond(false)

  // special case for openExternal
  if (permission == 'openExternal') {
    permDesc += page.getIntendedURL()
  }

  // create the prompt
  promptbar.add(page, {
    type: 'permission:'+permission,
    render: ({ rerender, onClose }) => {
      return yo`<div>
        <span class="icon icon-help-circled"></span>
        This site would like to ${permDesc}.
        <span class="promptbar-btns">
          <a class="btn" onclick=${() => { respond(true); onClose(); }}>Allow</a>
          <a onclick=${() => { respond(false); onClose(); }}>Don't Allow</a>
        </span>
        <a class="promptbar-close icon icon-cancel-squared" onclick=${() => { respond(false); onClose(); }}></a>
      </div>`
    },
    onForceClose: () => {
      respond(false)
    }
  })
}