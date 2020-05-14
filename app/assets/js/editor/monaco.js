require.config({ baseUrl: 'beaker://assets/' });
require(['vs/editor/editor.main'], function() {
  var commonOpts = {
    renderLineHighlight: 'none',
    lineNumbersMinChars: 4,
    automaticLayout: true,
    fixedOverflowWidgets: true,
    roundedSelection: false,
    model: null
  }
  window.editor = monaco.editor.create(document.getElementById('editor'), commonOpts)
  window.diffEditor = monaco.editor.createDiffEditor(document.getElementById('diffEditor'), Object.assign({}, commonOpts, {readOnly: true}))
  window.dispatchEvent(new Event('editor-created'))
})