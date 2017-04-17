import yo from 'yo-yo'
import {writeToClipboard} from '../../lib/fg/event-handlers'

// listen for context-target updates (fired from other parts of the app code)
var currentContext
window.addEventListener('set-context-target', e => {
  currentContext = e.detail
})

// exported api
// =

export default function setup () {
  document.body.appendChild(yo`
    <div>
      <menu type="context" id="file">
        <menuitem label="Rename" onclick=${onClickRename}></menuitem>
        <menuitem label="Delete file" onclick=${onClickDelete}></menuitem>
        <hr />
        <menuitem label="Copy URL" onclick=${onCopyURL}></menuitem>
        <menuitem label="Copy path" onclick=${onCopyRelativePath}></menuitem>
        <menuitem label="View file" onclick=${onClickView}></menuitem>
      </menu>
      <menu type="context" id="directory">
        <menuitem label="New file" onclick=${onClickNewFile}></menuitem>
        <menuitem label="New folder" onclick=${onClickNewFolder}></menuitem>
        <menuitem label="Import file(s) to this folder..." onclick=${onClickImport}></menuitem>
        <hr />
        <menuitem label="Rename" onclick=${onClickRename}></menuitem>
        <menuitem label="Delete folder" onclick=${onClickDelete}></menuitem>
        <menuitem label="Copy URL" onclick=${onCopyURL}></menuitem>
        <menuitem label="Copy path" onclick=${onCopyRelativePath}></menuitem>
      </menu>
    </div>
  `)
}

// event handlers
// =

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

function onCopyRelativePath () {
  if (currentContext) {
    writeToClipboard('/' + currentContext.path)
  }  
}

function emitEvent (type) {
  if (!currentContext) return
  // emit an event for the toplevel editor to handle
  var evt = new Event(type)
  evt.detail = {path: currentContext.path}
  window.dispatchEvent(evt)  
}

function onClickNewFile () {
  emitEvent('new-file')
}

function onClickNewFolder () {
  emitEvent('new-folder')
}

async function onClickImport () {
  emitEvent('import-files')
}

function onClickRename () {
  emitEvent('rename')
}

function onClickDelete () {
  emitEvent('delete')
}