import yo from 'yo-yo'
import {writeToClipboard} from '../../lib/fg/event-handlers'

// listen for context-target updates (fired from other parts of the app code)
var currentContext
window.addEventListener('set-context-target', e => {
  currentContext = e.detail
})

// exported api
// =

export default function render () {
  return yo`
    <div>
      <menu type="context" id="file">
        <menuitem label="Rename" onclick=${onClickRename}></menuitem>
        <menuitem label="Delete file" onclick=${onClickDelete}></menuitem>
        <menuitem label="View file externally" onclick=${onClickView}></menuitem>
        <menuitem label="Copy URL" onclick=${onCopyURL}></menuitem>
      </menu>
      <menu type="context" id="directory">
        <menuitem label="New file" onclick=${onClickNewFile}></menuitem>
        <menuitem label="New folder" onclick=${onClickNewFolder}></menuitem>
        <menuitem label="Import file(s) to this folder..." onclick=${onClickImport}></menuitem>
        <hr />
        <menuitem label="Rename" onclick=${onClickRename}></menuitem>
        <menuitem label="Delete folder" onclick=${onClickDelete}></menuitem>
        <menuitem label="Copy URL" onclick=${onCopyURL}></menuitem>
      </menu>
    </div>
  `
}

// event handlers
// =

function onClickRename () {
  alert('Not yet implemented')
}

function onClickDelete () {
  alert('Not yet implemented')
}

function onClickView () {
  if (currentContext) {
    window.open(currentContext.url)
  }
}

function onCopyURL () {
  if (currentContext) {
    writeToClipboard(currentContext.url)
  }
}

function onClickNewFile () {
  // emit an event for the toplevel editor to handle
  var evt = new Event('new-file')
  evt.detail = {path: currentContext.path}
  window.dispatchEvent(evt)
}

function onClickNewFolder () {
  // emit an event for the toplevel editor to handle
  var evt = new Event('new-folder')
  evt.detail = {path: currentContext.path}
  window.dispatchEvent(evt)
}

async function onClickImport () {
  // emit an event for the toplevel editor to handle
  var evt = new Event('import-files')
  evt.detail = {dst: currentContext.url}
  window.dispatchEvent(evt)
}