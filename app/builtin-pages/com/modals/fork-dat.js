import * as yo from 'yo-yo'
import * as modal from '../modal'

export function create (archiveInfo, archiveEntriesTree, { isDownloading, onClickDownload, onSubmit }) {
  var title = archiveInfo.title || ''
  var description = archiveInfo.description || ''
  return modal.create(({ close }) => {
    var isIncomplete = false

    var progressEl, downloadBtn
    if (!archiveInfo.isOwner) {
      // status/progress of download
      let entry = archiveEntriesTree.entry
      let progress = Math.round(entry.downloadedBlocks / entry.blocks * 100)
      isIncomplete = (entry.downloadedBlocks < entry.blocks)
      progressEl = yo`<div class="fork-dat-progress">
        <progress value=${progress} max="100"></progress>
        ${isIncomplete
          ? 'Some files have not been downloaded, and will be missing from your fork.'
          : 'Ready to fork.'}
      </div>`
      if (isIncomplete) {
        downloadBtn = yo`<a class="btn ${isDownloading ? 'disabled' : ''}" onclick=${_onClickDownload}>
          ${ isDownloading ? yo`<span class="spinner"></span>` : 'Finish'} Downloading Files
        </a>`
      }
    }

    return yo`<div class="fork-dat-modal">
      <h2>Fork Archive</h2>
      <div class="modal-section">
        <form onsubmit=${_onSubmit}>
          <div class="form-group">
            <input name="title" class="form-control" tabindex="1" value=${title} placeholder="New Name" onchange=${onChangeTitle} />
          </div>
          <div class="form-group">
            <input name="desc" class="form-control" tabindex="2" value=${description} placeholder="New Description" onchange=${onChangeDescription} />
          </div>
          ${progressEl}
          <div class="form-actions">
            ${downloadBtn}
            <button type="submit" class="btn" tabindex="3"><span class="icon icon-flow-branch"></span> Fork${isIncomplete ? ' Anyway' : ''}</button>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        Forking will create a new site with the content of the old site.
      </div>
    </div>`

    function onChangeTitle (e) {
      title = e.target.value
      console.log(title)
    }

    function onChangeDescription (e) {
      description = e.target.value
      console.log(description)
    }

    function _onClickDownload () {
      console.log('click')
      isDownloading = true
      onClickDownload()
    }

    function _onSubmit (e) {
      e.preventDefault()
      var form = e.target
      onSubmit({
        title: form.title.value,
        description: form.desc.value
      })
      close()
    }
  })
}

export function forkArchiveFlow (archive) {
  // create fork modal
  var modal = create(archive.info, archive.files.rootNode, {
    isDownloading: archive.isSaved,
    onClickDownload() {
      archive.files.download()
      modal.rerender()
    },
    onSubmit({ title, description }) {
      datInternalAPI.forkArchive(archive.info.key, { title, description, origin: 'beaker:archives' }).then(newKey => {
        window.location = 'beaker:archive/' + newKey
      }).catch(err => {
        console.error(err) // TODO alert user
      })
    }
  })

  // listen for archive download events
  function onchanged () { modal.rerender() }
  archive.on('changed', onchanged)
  modal.addEventListener('close', () => {
    archive.removeEventListener('changed', onchanged)
    modal = null
  }, { once: true })
}