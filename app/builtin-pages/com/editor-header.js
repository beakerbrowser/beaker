import * as yo from 'yo-yo'
import mime from 'mime'
import renderDropdownMenuBar from './dropdown-menu-bar'
import {niceDate} from '../../lib/time'
import {writeToClipboard} from '../../lib/fg/event-handlers'
import toggleable, {closeAllToggleables} from './toggleable'

// globals
// =

var dropMenuState = {}
var isEditingTitle = false

// exported api
// =

export function update (archive, path, activeUrl, isSaved, isOwner, isEditable) {
  if (!archive) {
    return
  }
  path = path || ''
  let readonly = isOwner ? '' : yo`<span class="readonly"><i class="fa fa-eye"></i> Read-only</span>`
  return yo.update(document.querySelector('.editor-header'), yo`
    <header class="editor-header">
      <a class="bigbutton" href="beaker://library" title="Open your library">
        <i class="fa fa-caret-left"></i>
      </a>
      <div class="main">
        <div class="path">
          ${rArchiveName(archive, isOwner)}
          ${rFilePath(path)}
        </div>
        ${rMenu(archive, path, isEditable)}
        ${readonly}
        <span class="last-updated">Updated ${niceDate(archive.info.mtime)}</span>
      </div>
      ${rActions(archive, isSaved, isOwner)}
    </header>`)
}

// renderers
// =

function rArchiveName (archive, isOwner) {
  if (!isOwner) {
    return yo`<div class="archive">${archive.niceName}</div>`
  }
  if (!isEditingTitle) {
    return yo`
      <div class="archive editable" onclick=${e => onStartEditingTitle(archive, isOwner)}>
        ${archive.niceName}
      </div>`
  }
  return yo`
    <div
      class="archive editing"
      onkeydown=${e => onTitleKeydown(e, archive, isOwner)}
      onblur=${e => onStopEditingTitle(archive, isOwner)}
      contenteditable="true"
    >${archive.niceName}</div>`
    // ^ important - dont put whitespace between the text content and the element tags
    // when this becomes a contenteditable, the whitespace gets included as a value
}

function rFilePath (path) {
  if (!path) {
    return ''
  }

  var label
  if (path.startsWith('buffer~~')) {
    label = 'New file'
  } else {
    label = path.split('/').map(part => yo`
      <span> / ${part}</span>
    `)
  }
  return yo`
    <div class="file">${label}</div>
  `
}

function rMenu (archive, path, isEditable) {
  return renderDropdownMenuBar(dropMenuState, [
    {
      label: 'File',
      menu: [
        {label: 'New file', click: 'new-file'},
        {label: 'New folder', click: 'new-folder'},
        {label: 'Import file(s)...', click: 'import-files'},
        '-',
        {label: '&Save file', disabled: !isEditable, click: 'save-file'},
        {label: 'Rename file', disabled: true},
        {label: 'Delete file', disabled: true},
        '-',
        {label: 'View site', click: () => window.open(archive.url)},
        {label: 'View current file', click: () => window.open(archive.url + '/' + path)},
        {label: 'Copy URL', click: () => writeToClipboard(archive.url)}
      ]
    },
    {
      label: 'Edit',
      menu: [
        {label: 'Undo', disabled: !isEditable, click: () => editor.executeCommand('keyboard', monaco.editor.Handler.Undo)},
        {label: 'Redo', disabled: !isEditable, click: () => editor.executeCommand('keyboard', monaco.editor.Handler.Redo)},
        '-',
        {label: 'Cut', disabled: !isEditable, click: () => { editor.focus(); document.execCommand('cut') }},
        {label: 'Copy', disabled: !isEditable, click: () => { editor.focus(); document.execCommand('copy') }},
        {label: 'Paste', disabled: !isEditable, click: () => { editor.focus(); document.execCommand('paste') }},
        '-',
        {label: 'Edit site details...', click: () => archive.updateManifest()}
      ]
    },
    {
      label: 'Tools',
      menu: [
        {label: 'Create new site', click: onCreate},
        {label: 'Fork this site', click: () => onFork(archive)},
        archive && archive.info.userSettings.isSaved
          ? {label: 'Delete this site', click: () => onDelete(archive)}
          : {label: 'Save this site', click: () => onSave(archive)},
        '-',
        {label: 'Settings', click: 'open-settings'}
      ]
    }
  ])
}

function rActions (archive, isSaved, isOwner) {
  let icon = 'fa fa-eye'
  let label = 'Read-only'
  let saveDesc = 'Keep this site permanently and receive updates.'
  let delDesc = 'Stop receiving updates and let the files be deleted.'
  if (isOwner) {
    if (isSaved) {
      icon = 'fa fa-pencil'
      label = 'Editing'
    } else {
      icon = 'fa fa-trash'
      label = 'Trashed'
    }
    saveDesc = 'Restore from the trash.'
    delDesc = 'Move this site to the trash.'
  }

  return yo`
    <div class="actions">
      <a class="btn" href=${archive.url} target="_blank"><i class="fa fa-external-link"></i> View site</a>
      ${toggleable(yo`
        <div class="dropdown-btn-container">
          <button class="btn toggleable">
            <i class=${icon}></i> ${label} <i class="fa fa-caret-down"></i>
          </button>

          <div class="dropdown-btn-list">
            <div onclick=${e => onFork(archive)}>
              <div class="title"><i class="fa fa-code-fork"></i> Fork this site</div>
              <div class="desc">Create an editable copy of this site.</div>
            </div>
            ${isSaved ? yo`
              <div onclick=${e => onDelete(archive)}>
                <div class="title"><i class="fa fa-trash"></i> Remove from library</div>
                <div class="desc">${delDesc}</div>
              </div>
              ` : yo`
              <div onclick=${e => onSave(archive)}>
                <div class="title"><i class="fa fa-floppy-o"></i> Save to library</div>
                <div class="desc">${saveDesc}</div>
              </div>
            `}
          </div>
        </div>
      `)}
      <button class="btn primary"><i class="fa fa-link"></i> Share</button>
    </div>
  `
}

// event handlers
// =

async function onCreate () {
  var archive = await DatArchive.create()
  window.location = 'beaker://editor/' + archive.url.slice('dat://'.length)
}

async function onFork (archive) {
  closeAllToggleables()
  var fork = await DatArchive.fork(archive, {
    title: archive.info.title,
    description: archive.info.description
  })
  window.location = 'beaker://editor/' + fork.url.slice('dat://'.length)
}

async function onSave (archive) {
  closeAllToggleables()
  await beaker.archives.add(archive.url)
  archive.info.userSettings.isSaved = true
  window.dispatchEvent(new Event('render'))
}

async function onDelete (archive) {
  closeAllToggleables()
  await beaker.archives.remove(archive.url)
  archive.info.userSettings.isSaved = false
  window.dispatchEvent(new Event('render'))
}

function onStartEditingTitle (archive, isOwner) {
  isEditingTitle = true
  var el = document.querySelector('header .archive')

  // re-render
  yo.update(el, rArchiveName(archive, isOwner))

  // focus and select text
  el.focus()
  var range = document.createRange()
  range.selectNodeContents(el)
  var sel = window.getSelection()
  sel.removeAllRanges()
  sel.addRange(range)
}

async function onStopEditingTitle (archive, isOwner, ignore) {
  isEditingTitle = false
  var el = document.querySelector('header .archive')

  if (!ignore) {
    // grab value
    var newTitle = (el.textContent || '').trim()

    // update if changed
    if (newTitle !== archive.info.title) {
      await beaker.archives.update(archive.url, {title: newTitle})
      archive.info.title = newTitle
    }
  }
  
  // rerender
  yo.update(document.querySelector('header .archive'), rArchiveName(archive, isOwner))
}

function onTitleKeydown (e, archive, isOwner) {
  if (e.keyCode === 13 /*enter*/) {
    onStopEditingTitle(archive, isOwner) 
  }
  if (e.keyCode === 27 /*escape*/) {
    onStopEditingTitle(archive, isOwner, true)
  }
}