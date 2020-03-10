var self = hyperdrive.self

var editors = {
  js: ace.edit('js'),
  css: ace.edit('css'),
  html: ace.edit('html')
}
window.editors = editors
editors.js.session.setMode('ace/mode/javascript')
editors.css.session.setMode('ace/mode/css')
editors.html.session.setMode('ace/mode/html')
for (let k in editors) {
  editors[k].session.setUseWorker(false)
  editors[k].session.setTabSize(2)
  editors[k].session.setUseSoftTabs(true)
}

var result = document.getElementById('result')
var iframe = document.createElement('iframe')
iframe.setAttribute('sandbox', 'allow-scripts')

setup()

async function setup () {
  var info = await self.getInfo()

  editors.js.setValue(await self.readFile('/index.js').catch(e => ''))
  editors.css.setValue(await self.readFile('/index.css').catch(e => ''))
  editors.html.setValue(await self.readFile('/index.html').catch(e => ''))
  for (let k in editors) {
    editors[k].selection.moveTo(0,0)
  }
  result.append(iframe)

  for (let k in editors) {
    editors[k].session.on('change', debounce(e => onChangeEditor(k), 1e3))
  }

  runSnippet()
}

function runSnippet () {
  iframe.src = `data:text/html;base64,${btoa(`
    <style>
      ${editors.css.getValue()}
    </style>
    ${editors.html.getValue()}
    <script>
      window.snippetUrl = "${window.location.toString()}";
      ${editors.js.getValue()}
    </script>
  `)}`
}

function debounce (fn, timeout) {
  var timer
  return () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(fn, timeout)
  }
}

async function onChangeEditor (id) {
  var editor = editors[id]
  var filename = `/index.${id}`
  var current = await self.readFile(filename).catch(e => '')
  if (current !== editor.getValue()) {
    runSnippet()
    self.writeFile(filename, editor.getValue()).catch(e => undefined)
  }
}