/* globals ace */

import yo from 'yo-yo'

var orgApplyDeltaFn

// exported api
// =

export function render (fileNode) {
  var el = yo`<div id="ace-editor" class="ace-editor" data-filename=${fileNode.name}>${fileNode.fileData}</div>`
  el.isSameNode = (other) => {
    // dont let yo (morphdom) redraw this element
    var isSameNode = other && other.classList && other.classList.contains('ace-editor')
    return isSameNode
  }

  return el
}

export function setup ({readOnly} = {}) {
  var el = document.getElementById('ace-editor')
  var editor = getEditor()
  if (!editor) return console.warn('file-editor setup() abort: no editor')
  editor.session.setTabSize(2)
  editor.session.setUseSoftTabs(true)
  if (readOnly) {
    setReadOnly(editor, true)
  }

  // detect and set the mode
  var modelist = ace.require('ace/ext/modelist')
  var mode = modelist.getModeForPath(el.dataset.filename).mode
  editor.session.setMode(mode)

  // detect and set indentation
  var whitespace = ace.require('ace/ext/whitespace')
  whitespace.detectIndentation(editor.session)

  // don't show vertical ruler
  editor.setShowPrintMargin(false)

  // set config settings
  updateConfigUI(editor)
}

export function config (opts) {
  var editor = getEditor()
  if (!editor) return console.warn('file-editor config() abort: no editor')
  if ('readOnly' in opts) {
    setReadOnly(editor, opts.readOnly)
  }
  if ('lineWrap' in opts) {
    editor.session.setUseWrapMode(opts.lineWrap)
  }
  if ('tabWidth' in opts) {
    editor.session.setTabSize(opts.tabWidth)
  }
  if ('indentationMode' in opts) {
    editor.session.setUseSoftTabs(opts.indentationMode === 'spaces')
  }
  updateConfigUI(editor)
}

export function getValue () {
  var editor = getEditor()
  if (!editor) return console.warn('file-editor getValue() abort: no editor')
  return editor.getValue()
}

export function setValue (v) {
  var editor = getEditor()
  if (!editor) return console.warn('file-editor setValue() abort: no editor')

  // re-enable edits so we can set the value
  if (orgApplyDeltaFn) {
    editor.session.getDocument().applyDelta = orgApplyDeltaFn
  }

  // set the value
  editor.setValue(v)
  editor.selection.clearSelection() // ace selects everything for some reason, dont do that

  // re-disable edits
  if (orgApplyDeltaFn) {
    editor.session.getDocument().applyDelta = function () { /* noop */ }
  }
}

export function isSetup () {
  var el = document.getElementById('ace-editor')
  return el && el.env // .env is set by the ace editor on create
}

// internal methods
// =

function getEditor () {
  var el = document.getElementById('ace-editor')
  if (!el) return
  return ace.edit(el, {
    useWorker: false,
    fontSize: '12.25px'
  })
}

function setReadOnly (editor, readOnly) {
  editor.setOptions({
    // readOnly, -- HACK- dont set readonly, ace doesnt let you copy text if it's on, see #1012 -prf
    highlightActiveLine: !readOnly,
    highlightGutterLine: !readOnly
  })
  // manually disable edits
  if (readOnly) {
    orgApplyDeltaFn = orgApplyDeltaFn || editor.session.getDocument().applyDelta
    editor.session.getDocument().applyDelta = function () { /* noop */ }
  } else if (orgApplyDeltaFn) {
    editor.session.getDocument().applyDelta = orgApplyDeltaFn
  }
  // show/hide the cursor
  editor.renderer.$cursorLayer.element.style.display = readOnly ? 'none' : ''
  // give focus
  if (!readOnly) {
    editor.focus()
  }
}

function updateConfigUI (editor) {
  try {
    document.querySelector('[name=lineWrap]').value = editor.session.getUseWrapMode() ? 'on' : 'off'
    document.querySelector('[name=indentationMode]').value = editor.session.getUseSoftTabs() ? 'spaces' : 'tabs'
    document.querySelector('[name=tabWidth]').value = editor.session.getTabSize()
  } catch (e) {
    // ignore
  }
}