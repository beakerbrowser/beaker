import * as yo from 'yo-yo'
import * as modal from '../modal'

export function create (archive, { onClickDownload, onSubmit }) {
  var title = archive.info.title || ''
  var description = archive.info.description || ''
  return modal.create(({ close }) => {
    var isIncomplete = false
    var isDownloading = archive.progress && archive.progress.isDownloading

    var progressEl, downloadBtn
    if (!archive.info.isOwner && archive.progress) {
      // status/progress of download
      isIncomplete = !archive.progress.isComplete
      progressEl = yo`<div class="fork-dat-progress">
        ${archive.progress.current > 0
          ? yo`<progress value=${archive.progress.current} max="100"></progress>`
          : ''}
        ${isIncomplete
          ? 'Some files have not been downloaded, and will be missing from your fork.'
          : 'Ready to fork.'}
      </div>`
      if (isIncomplete) {
        downloadBtn = yo`<button type="button" class="btn ${isDownloading ? 'disabled' : 'success'}" onclick=${_onClickDownload}>
          ${ isDownloading ? '' : 'Finish'} Downloading Files
        </button>`
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
            <button type="button" class="btn" onclick=${_onClickCancel}>Cancel</button>
            <button type="submit" class="btn ${!isIncomplete ? 'success' : ''}" tabindex="3">
              Create fork ${isIncomplete ? ' anyway' : ''}
            </button>
            ${downloadBtn}
          </div>
        </form>
      </div>`

    function onChangeTitle (e) {
      title = e.target.value
    }

    function onChangeDescription (e) {
      description = e.target.value
    }

    function _onClickCancel (e) {
      console.log('cancel')
      e.preventDefault()
      close()
    }

    function _onClickDownload (e) {
      e.preventDefault()
      if (archive.progress) {
        archive.progress.isDownloading = true
      }
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
  var modal = create(archive, {
    onClickDownload() {
      archive.download()
      modal.rerender()
    },
    onSubmit({ title, description }) {
      DatArchive.fork(archive.info.key, { title, description }).then(archive => {
        window.location = 'beaker:library/' + archive.url.slice('dat://'.length)
      }).catch(err => {
        console.error(err) // TODO alert user
      })
    }
  })

  // listen to archive download progress
  archive.startMonitoringDownloadProgress().then(() => {
    modal.rerender()
    function onrender () { modal.rerender() }
    archive.progress.addEventListener('changed', onrender)
    modal.addEventListener('close', () => {
      console.log(archive.progress)
      archive.progress.removeEventListener('changed', onrender)
      modal = null
    }, { once: true })
  })
}