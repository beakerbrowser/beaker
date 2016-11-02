import * as yo from 'yo-yo'
import * as promptbar from '../promptbar'

// exported api
// =

export default function (page, opts, respond) {
  // TODO let the user see and change the opts

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