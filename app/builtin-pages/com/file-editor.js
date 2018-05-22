/* globals ace */

import * as yo from 'yo-yo'

// exported api
// =

export function render (fileNode) {
  var el = yo`<div id="file-editor" class="file-editor" data-filename=${fileNode.name}>${fileNode.preview}</div>`
  el.isSameNode = (other) => {
    // dont let yo (morphdom) redraw this element
    return other && other.classList && other.classList.contains('file-editor')
  }

  return el
}

export function setup () {
  var el = document.getElementById('file-editor')
  var editor = ace.edit(el, {
    useWorker: false
  })
  editor.session.setTabSize(2)
  editor.session.setUseSoftTabs(true)

  // detect and set the mode
  var modelist = ace.require('ace/ext/modelist')
  var mode = modelist.getModeForPath(el.dataset.filename).mode
  editor.session.setMode(mode)

  // detect and set indentation
  var whitespace = ace.require('ace/ext/whitespace')
  whitespace.detectIndentation(editor.session)

  // set config settings
  document.querySelector('[name=indentationMode]').value = editor.session.getUseSoftTabs() ? 'spaces' : 'tabs'
  document.querySelector('[name=tabWidth]').value = editor.session.getTabSize()
}

export function config (opts) {
  var editor = ace.edit('file-editor')
  if ('softWrap' in opts) {
    editor.session.setUseWrapMode(opts.softWrap)
  }
  if ('tabWidth' in opts) {
    editor.session.setTabSize(opts.tabWidth)
  }
  if ('indentationMode' in opts) {
    editor.session.setUseSoftTabs(opts.indentationMode === 'spaces')
  }
}

export function getValue () {
  return ace.edit('file-editor').getValue()
}