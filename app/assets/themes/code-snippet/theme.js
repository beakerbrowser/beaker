var self = new Hyperdrive(location)

var editors = {
  js: document.getElementById('js'),
  css: document.getElementById('css'),
  html: document.getElementById('html')
}
var result = document.getElementById('result')
var iframe = document.createElement('iframe')
iframe.setAttribute('sandbox', 'allow-scripts')

setup()

async function setup () {
  var info = await self.getInfo()

  editors.js.value = await self.readFile('/index.js').catch(e => '')
  editors.css.value = await self.readFile('/index.css').catch(e => '')
  editors.html.value = await self.readFile('/index.html').catch(e => '')
  result.append(iframe)

  for (let k in editors) {
    editors[k].addEventListener('keyup', debounce(e => onChangeEditor(k), 1e3))
  }

  runSnippet()
}

function runSnippet () {
  iframe.src = `data:text/html;base64,${btoa(`
    <style>
      ${editors.css.value}
    </style>
    ${editors.html.value}
    <script>
      ${editors.js.value}
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
  if (current !== editor.value) {
    runSnippet()
    self.writeFile(filename, editor.value).catch(e => undefined)
  }
}