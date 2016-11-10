import { remote, ipcRenderer } from 'electron'
import * as yo from 'yo-yo'
import * as promptbar from '../promptbar'
import * as pages from '../../pages'
import PERMS from '../../../lib/perms'

// exported api
// =

export default function (reqId, webContentsId, permission) {
  var page
  const respond = decision => {
    ipcRenderer.send('permission-response', reqId, decision)
    if (page) {
      // update page perms
      page.fetchSitePerms()
    }
  }

  // look up the page, deny if failed
  page = pages.getByWebContents(remote.webContents.fromId(webContentsId))
  if (!page)
    return respond(false)

  // lookup the perm description. auto-deny if it's not a known perm.
  const [ permId, permParam ] = permission.split(':')
  const PERM = PERMS[permId]
  if (!PERM) return respond(false)
  const permIcon = PERM.icon
  var permDesc = PERM.desc

  // special case for openExternal
  if (permission == 'openExternal') {
    permDesc += page.getIntendedURL()
  }

  // run description functions
  if (typeof permDesc === 'function') {
    permDesc = permDesc(permParam)
  }

  // create the prompt
  promptbar.add(page, {
    type: 'permission:'+permission,
    render: ({ rerender, onClose }) => {
      return yo`<div>
        <span class="icon icon-${permIcon || 'help-circled'}"></span>
        This site would like to ${permDesc}.
        <span class="promptbar-btns">
          <a class="btn btn-primary prompt-accept" onclick=${() => { respond(true); onClose(); }}>Allow</a>
          <a class="prompt-reject" onclick=${() => { respond(false); onClose(); }}>Don't Allow</a>
        </span>
        <a class="promptbar-close icon icon-cancel-squared" onclick=${() => { respond(false); onClose(); }}></a>
      </div>`
    },
    onForceClose: () => {
      respond(false)
    }
  })
}