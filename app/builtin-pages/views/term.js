import * as yo from 'yo-yo'
import XHR from 'xhr-promise'
import path from 'path'
import minimist from 'minimist'
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor

// globals
// =

var cwd // current working directory. {url:, host:, pathname:, archive:}
var env // current working environment

// helper elem
const gt = () => {
  var el = yo`<span></span>`
  el.innerHTML = '&gt;'
  return el
}

// start
// =

document.addEventListener('keydown', onKeyDown, {capture: true})
readCWD()
updatePrompt()
evalEnvironment()
appendOutput(yo`<div><strong>Welcome to webterm.</strong> Type <code>help()</code> if you get lost.</div>`, cwd.pathname)

// output
// =

function appendOutput (output, thenCWD, cmd) {
  if (typeof output === 'undefined') {
    output = 'Ok.'
  } else if (output.toHTML) {
    output = output.toHTML()
  } else if (typeof output !== 'string' && !(output instanceof Element)) {
    output = JSON.stringify(output).replace(/^"|"$/g, '')
  }
  document.querySelector('.output').appendChild(yo`
    <div class="entry">
      <div class="entry-header">//${thenCWD.host}${thenCWD.pathname}${gt()} ${cmd || ''}</div>
      <div class="entry-content">${output}</div>
    </div>
  `)
  window.scrollTo(0, document.body.scrollHeight)
}

function appendError (msg, err, thenCWD, cmd) {
  appendOutput(yo`
    <div class="error">
      <div class="error-header">${msg}</div>
      <div class="error-stack">${err.toString()}</div>
    </div>
  `, thenCWD, cmd)
}

// prompt
//

function updatePrompt () {
  yo.update(document.querySelector('.prompt'), yo`
    <div class="prompt">
      //${cwd.host}${cwd.pathname}${gt()} <input onkeyup=${onPromptKeyUp} />
    </div>
  `)
}

function onKeyDown (e) {
  document.querySelector('.prompt input').focus()
}

function onPromptKeyUp (e) {
  if (e.code === 'Enter') {
    evalPrompt()
  }
}

function evalPrompt () {
  evalPromptInternal(appendOutput, appendError, env, parseCommand, updatePrompt)  
}

// use the func constructor to relax 'use strict'
// that way we can use with {}
var evalPromptInternal = new AsyncFunction('appendOutput', 'appendError', 'env', 'parseCommand', 'updatePrompt', `
  var prompt = document.querySelector('.prompt input')
  if (!prompt.value.trim()) {
    return
  }
  try {
    var res
    var oldCWD = Object.assign({}, env.term.getCWD())
    with (env) {
      res = await eval(parseCommand(prompt.value))
    }
    appendOutput(res, oldCWD, prompt.value)
  } catch (err) {
    appendError('Command error', err, oldCWD, prompt.value)
  }
  prompt.value = ''
  updatePrompt()
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
    return appendError('Failed to read environment script', err, cwd)
  }
  try {
    env = eval(res.responseText)(1)
    Object.assign(env, builtins)
    window.env = env
    console.log('Environment', env)
  } catch (err) {
    console.error(err)
    return appendError('Failed to evaluate environment script', err, cwd)
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
  html: yo,
  term: {
    getCWD () {
      return cwd
    },
    setCWD
  }
}