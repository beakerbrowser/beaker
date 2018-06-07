import {ipcRenderer} from 'electron'
import * as yo from 'yo-yo'
import * as prompt from '../prompt'
import * as pages from '../../pages'
import PERMS from '../../../lib/perms'
import { getPermId, getPermParam, shorten } from '../../../lib/strings'

// exported api
// =

export default function (reqId, webContentsId, permission, opts = {}) {
  var page
  const respond = decision => {
    ipcRenderer.send('permission-response', reqId, decision)
    if (page) {
      // update page perms
      page.fetchSitePerms()
    }
  }

  // look up the page, deny if failed
  page = pages.getByWebContentsID(webContentsId)
  if (!page) { return respond(false) }

  // lookup the perm description. auto-deny if it's not a known perm.
  const permId = getPermId(permission)
  const permParam = getPermParam(permission)
  const PERM = PERMS[permId]
  if (!PERM) return respond(false)
  const permIcon = PERM.icon
  var permDesc = PERM.desc

  // special case for openExternal
  if (permission == 'openExternal') {
    permDesc += shorten(page.getIntendedURL(), 128)
  }

  // run description functions
  if (typeof permDesc === 'function') {
    permDesc = permDesc(permParam, pages, opts)
  }

  // create the prompt
  let res = prompt.add(page, {
    type: 'permission:' + permission,
    render: ({ rerender, onClose }) => {
      return yo`
        <div>
          <p>This site wants to:</p>
          <p class="perm">
            <i class="fa fa-${permIcon}"></i>
            ${permDesc}
          </p>

          <div class="prompt-btns">
            <button class="btn prompt-reject" onclick=${() => { respond(false); onClose() }}>Block</button>
            <button class="btn primary prompt-accept" onclick=${() => { respond(true); onClose() }}>Allow</button>
          </div>

          ${PERM.experimental
            ? yo`
              <div class="perm-experimental">
                <i class="fa fa-info-circle"></i>
                <span>This page is requesting an experimental feature. Only click 'Allow' if you trust this page.</span>
              </div>`
            : ''}
        </div>
      `
    },
    onForceClose: () => {
      respond(false)
    }
  })
  if (!res) respond(false)
}
