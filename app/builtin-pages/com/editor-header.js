import * as yo from 'yo-yo'
import mime from 'mime'
import renderDropdownMenuBar from './dropdown-menu-bar'
import {niceDate} from '../../lib/time'

// globals
// =

var dropMenuState = {}

// exported api
// =

export function update (archive, path, activeUrl, isActiveFileDirty) {
  if (!archive) {
    return ''
  }
  path = path || ''
      // <span class="save-prompt">${isDirty ? 'Save changes' : ''}</span> TODO
      // <button
      //   ${!isDirty ? 'disabled' : ''}
      //   onclick=${e => onSaveFile(path, url)}
      //   class="save"
      //   title="Save This File's Changes">
      //   <i class="fa fa-save"></i>
      // </button>
      // <button title="Open File In New Window" onclick=${e => onOpenInNewWindow(e, url)}>
      //   <i class="fa fa-external-link"></i>
      // </button>
  return yo.update(document.querySelector('.editor-header'), yo`
    <header class="editor-header">
      <a class="bigbutton" href="beaker://library" title="Open your library">
        <i class="fa fa-caret-left"></i>
      </a>
      <div class="main">
        <div class="path">
          ${rArchiveName(archive)}
          ${rFilePath(path)}
        </div>
        ${rMenu(archive, path)}
        <span class="last-updated">Updated ${niceDate(archive.info.mtime)}</span>
      </div>
      ${rActions(path, activeUrl, isActiveFileDirty)}
    </header>`)
}

// renderers
// =

function rArchiveName (archive) {
  return yo`<div class="archive">${archive.niceName}</div>`
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

function rMenu (archive, path) {
  return renderDropdownMenuBar(dropMenuState, [
    {
      label: 'File',
      menu: [
        {label: 'New file'},
        {label: 'New folder'},
        {label: 'Import file(s)...'},
        '-',
        {label: '&Save file'},
        {label: 'Rename file', disabled: true},
        {label: 'Delete file', disabled: true},
        '-',
        {label: 'View site'},
        {label: 'View current file'},
        {label: 'Copy URL'}
      ]
    },
    {
      label: 'Edit',
      menu: [
        {label: 'Edit site details...'},
        '-',
        {label: 'Undo'},
        {label: 'Redo'},
        '-',
        {label: 'Cut'},
        {label: 'Copy'},
        {label: 'Paste'}
      ]
    },
    {
      label: 'Tools',
      menu: [
        {label: 'Create new site'},
        {label: 'Fork this site'},
        {label: 'Delete this site'},
        '-',
        {label: 'Settings'}
      ]
    }
  ])
}

function rActions (path, url, isDirty) {
  return yo`
    <div class="actions">
      <a class="btn primary"><i class="fa fa-link"></i> Share</a>
    </div>
  `
}

function onSaveFile (path, url) {
  // dispatch an app event
  var evt = new Event('save-file')
  evt.detail = { path: path, url: url}
  window.dispatchEvent(evt)
}

function onOpenInNewWindow (e, url) {
  e.preventDefault()
  e.stopPropagation()
  beakerBrowser.openUrl(url)
}
