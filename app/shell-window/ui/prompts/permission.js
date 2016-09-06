import * as yo from 'yo-yo'
import * as promptbar from '../promptbar'

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

export default function (permission, page, grant, deny) {
  // lookup the perm description. auto-deny if it's not a known perm.
  var permDesc = PERM_DESCS[permission]
  if (!permDesc)
    return deny()

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
          <a class="btn" onclick=${() => { grant(); onClose(); }}>Allow</a>
          <a onclick=${() => { deny(); onClose(); }}>Don't Allow</a>
        </span>
        <a class="promptbar-close icon icon-cancel-squared" onclick=${() => { deny(); onClose(); }}></a>
      </div>`
    },
    onForceClose: () => {
      deny()
    }
  })
}

