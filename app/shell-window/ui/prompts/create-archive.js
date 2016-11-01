import * as yo from 'yo-yo'
import * as promptbar from '../promptbar'

// exported api
// =

export default function (page, reqId, opts = {}) {
  // TODO let the user see and change the opts

  var url = page.getURL()
  const respond = decision => {
    // check if the original page is still active
    if (page.getURL() !== url) {
      page.webviewEl.send('dat-response', reqId, 'user-denied')
      return
    }
    
    if (decision === false) {
      // send deny
      page.webviewEl.send('dat-response', reqId, 'user-denied')
    } else {
      // create the archive
      datInternalAPI.createNewArchive({
        title: opts.title,
        description: opts.description,
        saveClaim: page.getURL()
      }).then(
        key => page.webviewEl.send('dat-response', reqId, null, 'dat://' + key + '/'),
        err => page.webviewEl.send('dat-response', err)
      )
    }
  }

  // create the prompt
  promptbar.add(page, {
    render: ({ rerender, onClose }) => {
      return yo`<div>
        <span class="icon icon-folder"></span>
        This site would like to create a new Dat archive.
        <span class="promptbar-btns">
          <a class="btn btn-primary prompt-accept" onclick=${() => { respond(true); onClose(); }}>Create</a>
          <a class="prompt-reject" onclick=${() => { respond(false); onClose(); }}>Cancel</a>
        </span>
        <a class="promptbar-close icon icon-cancel-squared" onclick=${() => { respond(false); onClose(); }}></a>
      </div>`
    },
    onForceClose: () => {
      respond(false)
    }
  })
}