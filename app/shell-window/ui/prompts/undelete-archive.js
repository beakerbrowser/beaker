import * as yo from 'yo-yo'
import * as promptbar from '../promptbar'
import * as pages from '../../pages'

// exported api
// =

export default function (page, archiveDetails, restoreArchive) {
  const title = archiveDetails.title || 'Untitled'
  const viewArchive = () => pages.setActive(pages.create('beaker:archive/' + archiveDetails.key))

  // create the prompt
  promptbar.add(page, {
    render: ({ rerender, onClose }) => {
      return yo`<div>
        <span class="icon icon-folder"></span>
        This site has deleted the archive <a onclick=${viewArchive}>${title}</a>. Is this ok?
        <span class="promptbar-btns">
          <a class="btn prompt-accept" onclick=${onClose}>OK</a>
          <a class="prompt-reject" onclick=${() => { restoreArchive(); onClose(); }}>Undo</a>
        </span>
      </div>`
    }
  })
}