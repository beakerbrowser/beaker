import yo from 'yo-yo'
import {emit} from '../../../lib/fg/event-handlers'
import createMd from '../../../lib/fg/markdown'

// exported api
// =

export function renderGeneralHelp (archiveInfo, readmeMd) {
  const isOwner = archiveInfo.isOwner
  return yo`
    <div class="editor-general-help">
      <div class="quick-links">
        <div class="col">
          ${isOwner
            ? yo`
              <div class="quick-link">
                <h3>Get started</h3>
                <div>
                  Create an
                  <a class="link" onclick=${e => onCreateFile(e, 'index.html')}>index.html</a>
                  or
                  <a class="link" onclick=${e => onCreateFile(e, 'index.md')}>index.md</a>.
                </div>
              </div>`
            : ''}
            ${isOwner
              ? yo`
                <div class="quick-link">
                  <h3>Actions</h3>
                  <div><a class="link" onclick=${e => emit('editor-new-folder', {path: '/'})}>New folder</a></div>
                  <div><a class="link" onclick=${e => emit('editor-new-file', {path: '/'})}>New file</a></div>
                  <div><a class="link" onclick=${e => emit('editor-import-files', {path: '/'})}>Import...</a></div>
                </div>`
              : ''}
          <div class="quick-link">
            <h3>Find help</h3>
            <div>Read the <a class="link" href="https://beakerbrowser.com/docs" target="_blank">Beaker documentation</a>.</div>
          </div>
        </div>
        <div class="col">
          <div class="quick-link">
            <h3>Manage the site</h3>
            <div>Want to make a copy? <a class="link" onclick=${e => emit('editor-fork')}>Duplicate it</a>.</div>
            ${isOwner
              ? [
                yo`<div>Want to preview changes? <a class="link" onclick=${doClick('.options-dropdown-btn')}>Enable preview mode</a>.</div>`,
                yo`<div>Not useful anymore? <a class="link" onclick=${e => emit('editor-move-to-trash')}>Move to trash</a>.</div>`
              ] : ''}
          </div>
          ${isOwner
            ? yo`
              <div class="quick-link">
                <h3>Metadata</h3>
                <div>Want to change the title or description? <a class="link" onclick=${doClick('.site-info-btn')}>Edit details</a>.</div>
                <div>Want to change the favicon? <a class="link" onclick=${doClick('.favicon-picker-btn')}>Edit icon</a>.</div>
              </div>`
            : ''}
        </div>
      </div>
      ${renderReadme(archiveInfo, readmeMd)}
    </div>`
}

function renderReadme (archiveInfo, readmeMd) {
  if (!readmeMd) return ''

  var markdownRenderer = createMd({
    hrefMassager (href) {
      var isRelative = href.startsWith('/') || href.startsWith('./')
      if (!isRelative && href.indexOf(':') === -1) {
        isRelative = true
      }
      if (isRelative) {
        if (href.startsWith('./')) href = href.slice(2)
        if (href.startsWith('/')) href = href.slice(1)
        return `${archiveInfo.url}/${href}`
      }
      return href
    }
  })

  var readmeContent = yo`<div class="readme markdown"></div>`
  readmeContent.innerHTML = markdownRenderer.render(readmeMd)
  return readmeContent
}

// event handlers
// =

function onCreateFile (e, path) {
  emit('editor-create-file', {path})
}

function doClick (sel) {
  return e => {
    e.preventDefault()
    e.stopPropagation()
    document.querySelector(sel).click()
  }
}
