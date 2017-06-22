import * as yo from 'yo-yo'

// globals
// =

var cwl // current working location. {url:, host:, pathname:}

// start
// =

readCWL()
updatePrompt()
focusPrompt()
appendOutput(yo`<div><strong>Welcome to webterm.</strong> Type <code>help()</code> if you get lost.</div>`)

// output
// =

function appendOutput (output) {
  document.querySelector('.output').appendChild(yo`
    <div class="entry">
      <div class="entry-header">${(new Date()).toLocaleTimeString()}</div>
      <div class="entry-content">${output}</div>
    </div>
  `)
}

// prompt
//

function updatePrompt () {
  yo.update(document.querySelector('.prompt'), yo`
    <div class="prompt">
      <input onblur=${focusPrompt} />
    </div>
  `)
}

function focusPrompt () {
  document.querySelector('.prompt input').focus()
}

// helpers
// =

function readCWL () {
  let url = window.location.pathname.slice(2)
  let host = url.slice(0, url.indexOf('/'))
  let pathname = url.slice(url.indexOf('/'))
  cwl = {url, host, pathname}

  console.debug('CWL', cwl)
  document.title = `${cwl.host || cwl.url} | Terminal`
}
