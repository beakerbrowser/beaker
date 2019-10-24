// exported
// =

export async function createEditor () {
  return new Promise(resolve => {
    document.body.append(createEl('div', {id: 'monaco-editor'}))
    document.head.append(createEl('script', {src: 'beaker://assets/vs/loader.js', onload}))
    function onload () {
      window.require.config({ baseUrl: 'beaker://assets/' })
      window.require(['vs/editor/editor.main'], () => {
        console.log('monaco loaded')
        var editor = monaco.editor.create(document.getElementById('monaco-editor'), {
          folding: false,
          renderLineHighlight: 'all',
          lineNumbersMinChars: 4,
          automaticLayout: true,
          fixedOverflowWidgets: true,
          roundedSelection: false,
          scrollBeyondLastLine: false,
          minimap: {enabled: false},
          theme: 'vs-light',
          value: ''
        })
        resolve(editor)
      })
    }
  })
}

// internal
// =

function createEl (tag, attrs = {}) {
  var el = document.createElement(tag)
  for (let k in attrs) el[k] = attrs[k]
  return el
}