import * as yo from 'yo-yo'
import { createArchiveFlow } from '../com/modals/edit-site'

// exported api
// =

export function render (archive, opts = {}) {
  // const rerender = opts.render || (() => {})
  if (opts.viewError) return renderError(opts.viewError)
  if (!archive) return renderEmpty()
  return renderArchive(archive, opts)
}

function renderEmpty () {
  return yo`<div class="archives-view">
    <div class="archives-empty-banner">
      <h2>No site selected.</h2>
      <p>Share files, pages, and applications. <a onclick=${createArchiveFlow}>New site</a>.</p>
    </div>
  </div>`
}

function renderError (error) {
  return yo`<div class="archive">
    <div class="archive-error">
      <div class="archive-error-banner">
        <div class="icon icon-attention"></div>
        <div>The archive failed to load. ${error.toString()}. Sorry for the inconvenience.</div>
      </div>
      <div class="archive-error-narclink">
        <a href="https://github.com/beakerbrowser/beaker/issues" target="_blank">Report Issue</a>
        | 
        <a href="https://groups.google.com/forum/#!forum/beaker-browser" target="_blank">Request Help</a>
      </div>
    </div>
  </div>`
}

function renderArchive (archive, opts) {
  return yo`<span>todo: ${archive.info.key}</span>`
}