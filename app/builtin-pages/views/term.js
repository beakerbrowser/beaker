import * as yo from 'yo-yo'
import XHR from 'xhr-promise'

// globals
// =

var cwl // current working location. {url:, host:, pathname:}
var env // current working environment

// start
// =

readCWL()
updatePrompt()
focusPrompt()
evalEnvironment()
appendOutput(yo`<div><strong>Welcome to webterm.</strong> Type <code>help()</code> if you get lost.</div>`)

// output
// =

function appendOutput (output ,cmd) {
  document.querySelector('.output').appendChild(yo`
    <div class="entry">
      <div class="entry-header">${(new Date()).toLocaleTimeString()} ${cmd || ''}</div>
      <div class="entry-content">${output}</div>
    </div>
  `)
  window.scrollTo(0, document.body.scrollHeight)
}

function appendError (msg, err, cmd) {
  appendOutput(yo`
    <div class="error">
      <div class="error-header">${msg}</div>
      <div class="error-stack">${err.toString()}</div>
    </div>
  `, cmd)
}

// prompt
//

function updatePrompt () {
  yo.update(document.querySelector('.prompt'), yo`
    <div class="prompt">
      <input onblur=${focusPrompt} onkeyup=${onPromptKeyup} />
    </div>
  `)
}

function focusPrompt () {
  document.querySelector('.prompt input').focus()
}

function onPromptKeyup (e) {
  // console.log(e.keyCode)
  if (e.keyCode === 13) {
    evalPrompt(appendOutput, appendError, env)
  }
}

// use the func constructor to relax 'use strict'
// that way we can use with {}
var evalPrompt = new Function('appendOutput', 'appendError', 'env', `
  var prompt = document.querySelector('.prompt input')
  try {
    var res
    with (env) {
      res = eval(prompt.value)
    }
    if (typeof res !== 'undefined') {
      appendOutput(JSON.stringify(res, null, 4) + '\\nOk.', prompt.value)
    } else {
      appendOutput('Ok.', prompt.value)
    }
  } catch (err) {
    appendError('Command error', err, prompt.value)
  }
  prompt.value = ''
`)

// environment
// =

async function evalEnvironment () {
  try {
    var req = new XHR()
    var res = await req.send({url: 'term://_internal/env.js'})
  } catch (err) {
    console.error(err)
    return appendError('Failed to read environment script', err)
  }
  try {
    env = eval(res.responseText)(1)
    console.debug('Environment', env)
  } catch (err) {
    console.error(err)
    return appendError('Failed to evaluate environment script', err)
  }
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
