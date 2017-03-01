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

    return yo`
      <div class="fork-dat-modal">
        <h2 class="title">Fork archive</h2>
        <p class="help-text">
          Create a copy of this archive and save it to your library
        </p>

        <form onsubmit=${_onSubmit}>
          <label for="title">Title</label>
          <input name="title" tabindex="1" value=${title} placeholder="New Name" onchange=${onChangeTitle} />

          <label for="desc">Description</label>
          <input name="desc" tabindex="2" value=${description} placeholder="New Description" onchange=${onChangeDescription} />

          ${progressEl}
          <div class="form-actions">
            <button class="btn">Cancel</button>
            ${downloadBtn}
            <button type="submit" class="btn success" tabindex="3">
              Create fork ${isIncomplete ? ' anyway' : ''}
            </button>
          </div>
        </form>
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
      datInternalAPI.forkArchive(archive.info.key, { title, description, origin: 'beaker:library' }).then(newKey => {
        window.location = 'beaker:library/' + newKey
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