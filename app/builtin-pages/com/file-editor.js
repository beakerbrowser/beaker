/* globals ace */

import * as yo from 'yo-yo'

var orgApplyDeltaFn

// exported api
// =

export function render (fileNode) {
  var el = yo`<div id="ace-editor" class="ace-editor" data-filename=${fileNode.name}>${fileNode.preview}</div>`
  el.isSameNode = (other) => {
    // dont let yo (morphdom) redraw this element
    var isSameNode = other && other.classList && other.classList.contains('ace-editor')
    return isSameNode
  }

  return el
}

export function setup ({readOnly} = {}) {
  var el = document.getElementById('ace-editor')
  if (!el) return
  var editor = ace.edit(el, {
    useWorker: false
  })
  if (!orgApplyDeltaFn) {
    orgApplyDeltaFn = editor.session.getDocument().applyDelta // capture for later
  }
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
  var editor = ace.edit('ace-editor')
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
  return ace.edit('ace-editor').getValue()
}

export function setValue (v) {
  var editor = ace.edit('ace-editor')
  editor.setValue(v)
  editor.selection.clearSelection() // ace selects everything for some reason, dont do that
}

// internal methods
// =

function setReadOnly (editor, readOnly) {
  editor.setOptions({
    // readOnly, -- HACK- dont set readonly, ace doesnt let you copy text if it's on, see #1012 -prf
    highlightActiveLine: !readOnly,
    highlightGutterLine: !readOnly
  })
  // manually disable edits
  if (readOnly) {
    editor.session.getDocument().applyDelta = function () {/* noop */}
  } else {
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