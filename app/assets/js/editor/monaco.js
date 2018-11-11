require.config({ baseUrl: 'beaker://assets/' });
require(['vs/editor/editor.main'], function() {
  window.editor = monaco.editor.create(document.getElementById('editor'), {
    lineNumbersMinChars: 4,
    automaticLayout: true,
    fixedOverflowWidgets: true,
    roundedSelection: false,
    model: null
  })
  window.dispatchEvent(new Event('editor-created'))
})