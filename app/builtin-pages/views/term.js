import * as yo from 'yo-yo'
import XHR from 'xhr-promise'
import path from 'path'
import minimist from 'minimist'
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor

// globals
// =

var cwd // current working directory. {url:, host:, pathname:, archive:}
var env // current working environment

// start
// =

readCWD()
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
    evalPrompt()
  }
}

function evalPrompt () {
  evalPromptInternal(appendOutput, appendError, env, parseCommand)  
}

// use the func constructor to relax 'use strict'
// that way we can use with {}
var evalPromptInternal = new AsyncFunction('appendOutput', 'appendError', 'env', 'parseCommand', `
  var prompt = document.querySelector('.prompt input')
  if (!prompt.value.trim()) {
    return
  }
  try {
    var res
    with (env) {
      res = await eval(parseCommand(prompt.value))
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
  prompt.focus()
`)

function parseCommand (str) {
  // parse the command
  var parts = str.split(' ')
  var cmd = parts[0]
  var argsParsed = minimist(parts.slice(1))
  console.log(JSON.stringify(argsParsed))

  // form the js call
  var args = argsParsed._
  delete argsParsed._
  if (Object.keys(argsParsed).length > 0) {
    args.push(argsParsed)
  }

  console.log(`${cmd}(${args.map(JSON.stringify).join(', ')})`)
  return `${cmd}(${args.map(JSON.stringify).join(', ')})`
}

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
    Object.assign(env, builtins)
    window.env = env
    console.log('Environment', env)
  } catch (err) {
    console.error(err)
    return appendError('Failed to evaluate environment script', err)
  }
}

// current working location
// =

function setCWD (location) {
  try {
    if (location.startsWith('//')) {
      location = `dat://${location}`
    } else if (location.startsWith('/')) {
      location = `dat://${cwd.host}${location}`
    }
    let locationParsed = new URL(location)
    location = `${locationParsed.host}${locationParsed.pathname}`
  } catch (err) {
    location = `${cwd.host}${path.join(cwd.pathname, location)}`
  }

  window.history.pushState(null, {}, 'term://' + location)
  readCWD()
}

function readCWD () {
  let url = window.location.pathname.slice(2)
  let host = url.slice(0, url.indexOf('/'))
  let pathname = url.slice(url.indexOf('/'))
  let archive = new DatArchive(host)
  cwd = {url, host, pathname, archive}

  console.log('CWD', cwd)
  document.title = `${cwd.host || cwd.url} | Terminal`
}

// builtins
// =

const builtins = {
  term: {
    getCWD () {
      return cwd
    },
    setCWD
  }
}