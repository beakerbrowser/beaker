import { LitElement, html, TemplateResult } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import minimist from './lib/minimist.1.2.0.js'
import { Cliclopts } from './lib/cliclopts.1.1.1.js'
import { createArchive } from './lib/term-archive-wrapper.js'
import { importModule } from './lib/import-module.js'
import { joinPath, DAT_KEY_REGEX, shortenAllKeys } from 'beaker://app-stdlib/js/strings.js'
import { findParent } from 'beaker://app-stdlib/js/dom.js'
import css from '../css/main.css.js'
import './lib/term-icon.js'

// export lit-html as a window global
window.html = html

const THEME_PATH = '/settings/terminal.css'
const TAB_COMPLETION_RENDER_LIMIT = 15

class WebTerm extends LitElement {
  static get styles () {
    return [css]
  }

  constructor () {
    super()
    this.isLoaded = false
    this.startUrl = ''
    this.url = ''
    this.commands = {}
    this.commandModules = {}
    this.cwd = undefined
    this.outputHist = []
    this.fs = undefined
    this.tabCompletion = undefined
    this.liveHelp = undefined

    this.commandHist = {
      array: [],
      insert: -1,
      cursor: -1,
      add (entry) {
        if (entry) {
          this.array.push(entry)
        }
        this.cursor = this.array.length
      },
      prevUp () {
        if (this.cursor === -1) return ''
        this.cursor = Math.max(0, this.cursor - 1)
        return this.array[this.cursor]
      },
      prevDown () {
        this.cursor = Math.min(this.array.length, this.cursor + 1)
        return this.array[this.cursor] || ''
      },
      reset () {
        this.cursor = this.array.length
      }
    }

    this.addEventListener('keydown', e => {
      if (e.key.match(/^[\d\w]$/i) && !e.ctrlKey && !e.metaKey) {
        // text written, focus the cli
        this.setFocus()
      }
    })

    this.addEventListener('click', e => {
      let anchor = findParent(e.path[0], el => el.tagName === 'A')
      if (anchor) {
        e.stopPropagation()
        e.preventDefault()
        if (e.metaKey) {
          beaker.browser.openUrl(anchor.getAttribute('href'), {setActive: true})
        } else {
          beaker.browser.gotoUrl(anchor.getAttribute('href'))
        }
        return
      }
      if (e.path[0] === this) {
        // click outside of any content, focus the cli
        this.setFocus()
      }
    })

    this.url = navigator.filesystem.url
  }

  teardown () {

  }

  get promptInput () {
    try { return this.shadowRoot.querySelector('.prompt input').value }
    catch (e) { return '' }
  }

  async load (url) {
    this.url = url
    if (!this.fs) {
      this.fs = navigator.filesystem
    }

    var cwd = this.parseURL(this.url)
    while (cwd.pathame !== '/') {
      try {
        let st = await (createArchive(cwd.origin)).stat(cwd.pathname)
        if (st.isDirectory()) break
      } catch (e) { /* ignore */ }
      cwd.pathname = cwd.pathname.split('/').slice(0, -1).join('/')
    }
    this.cwd = cwd

    if (!this.isLoaded) {
      await this.importEnvironment()
      await this.output(html`<div><strong>Welcome to webterm 1.0.</strong> Type <code>help</code> if you get lost.</div>`)
      this.isLoaded = true
    }

    this.setFocus()
    this.requestUpdate()
  }

  async importEnvironment () {
    this.loadTheme()
    this.loadCommands()
    this.loadBuiltins()
  }

  async loadTheme () {
    // load theme
    try {
      let themeSheet = new CSSStyleSheet()
      let themeCSS = await this.fs.readFile(THEME_PATH)
      themeSheet.replace(themeCSS)
      this.shadowRoot.adoptedStyleSheets = Array.from(this.shadowRoot.adoptedStyleSheets).concat(themeSheet)
    } catch (e) {
      console.log('Failed to load theme css', e)
    }
  }

  async loadCommands () {
    var packages = [{
      url: 'beaker://std-cmds/',
      manifest: await (await fetch('beaker://std-cmds/index.json')).json()
    }]

    var userPackages = await navigator.filesystem.query({
      path: '/settings/webterm/cmds/*'
    })
    userPackages = userPackages.filter(p => p.stat.isDirectory())
    for (let pkg of userPackages) {
      pkg.name = pkg.path.split('/').pop()
      try {
        pkg.manifest = JSON.parse(await navigator.filesystem.readFile(`/${pkg.path}/index.json`))
      } catch (e) {
        console.log(e)
        this.outputError(`Failed to read ${pkg.path} manifest`, e.toString())
      }
    }
    packages = packages.concat(userPackages)
    console.log(packages)

    for (let pkg of packages) {
      var pkgId = pkg.name || pkg.url
      var commands = pkg.manifest.commands
      if (!commands || !Array.isArray(commands) || commands.length === 0) {
        this.outputError(`Skipping ${pkg.manifest.title} (${pkg.url})`, 'No commands found')
        continue
      }

      try {
        // HACK we use importModule() instead of import() because I could NOT get rollup to leave dynamic imports alone -prf
        this.commandModules[pkgId] = await importModule(joinPath(pkg.url, 'index.js'))
      } catch (err) {
        this.outputError(`Failed to load ${pkg.manifest.title} (${pkg.url}) index.js`, err)
        continue
      }

      for (let command of commands) {
        if (!command.name) continue
        let commandData = {
          fn: this.commandModules[pkgId][command.name],
          package: pkgId,
          name: command.name,
          path: [command.name],
          help: command.help,
          usage: command.usage,
          options: command.options,
          subcommands: subcommandsMap(pkg, this.commandModules[pkgId], command)
        }
        if (!(command.name in this.commands)) {
          this.commands[command.name] = commandData
        } else {
          this.outputError(`Unabled to add ${command.name} from ${pkg.manifest.title}`, 'Command name already in use')
        }
      }
    }
  }

  async loadBuiltins () {
    this.commandModules.builtins = {help: this.help.bind(this)}
    this.commands.help = {
      fn: this.help.bind(this),
      package: 'builtins',
      name: 'help',
      help: 'Get documentation on a command',
      usage: 'help [command]'
    }
  }

  setCWD (location) {
    var locationParsed
    if (location.startsWith('dat://')) {
      try {
        locationParsed = new URL(location)
        location = `${locationParsed.host}${locationParsed.pathname}`
      } catch (err) {
        location = `${this.cwd.host}${joinPath(this.cwd.pathname, location)}`
      }
      locationParsed = new URL('dat://' + location)
    } else {
      locationParsed = new URL(location)
    }

    this.url = location
    this.cwd = locationParsed
  }

  parseURL (url) {
    if (!url.includes('://')) url = 'dat://' + url
    return new URL(url)
  }

  outputHeader (thenCwd, cmd) {
    let host = this.isFSRoot(thenCwd.host) ? '~' : shortenHash(thenCwd.host)
    let pathname = shortenAllKeys(thenCwd.pathname || '').replace(/\/$/, '')
    this.outputHist.push(html`<div class="header">${host}${pathname}&gt; ${cmd || ''}</div>`)
  }

  async output (output) {
    return this._output(this.outputHist, output)
  }

  async _output (buffer, output) {
    // create the place in the history
    var index = buffer.length
    buffer.push(html``)

    // show a spinner for promises
    if (output instanceof Promise) {
      buffer.splice(index, 1, html`
        <div class="entry"><span class="spinner"></span></div>
      `)
      this.requestUpdate()

      try {
        output = await output
      } catch (err) {
        output = html`<div class="error"><div class="error-stack">${err.toString()}</div></div>`
      }
    }

    // finished, render/replace with final output
    if (typeof output === 'undefined') {
      output = ''
    } else if (output.toHTML) {
      output = output.toHTML()
    } else if (typeof output !== 'string' && !(output instanceof TemplateResult)) {
      output = JSON.stringify(output)
    }
    buffer.splice(index, 1, html`
      <div class="entry">${output}</div>
    `)
    this.requestUpdate()
  }

  outputError (msg, err, thenCWD, cmd) {
    if (thenCWD || cmd) this.outputHeader(thenCWD, cmd)
    this.output(html`<div class="error"><div class="error-header">${msg}</div><div class="error-stack">${err ? err.toString() : ''}</div></div>`)
  }

  clearHistory () {
    this.outputHist = []
    this.requestUpdate()
  }

  async evalPrompt () {
    var prompt = this.shadowRoot.querySelector('.prompt input')
    if (!prompt.value.trim()) {
      return
    }
    this.commandHist.add(prompt.value)
    var inputValue = prompt.value
    var args = prompt.value.split(' ')
    var paramsIndex = 1
    prompt.value = ''

    var commandName = args[0]
    var command = this.commands[commandName]
    if (command && command.subcommands) {
      command = command.subcommands[args[1]]
      paramsIndex = 2
    }
    if (!command) {
      this.outputError('', `Command not found: ${commandName}`, this.cwd, commandName)
      this.readTabCompletionOptions()
      return false
    }

    var cliclopts = new Cliclopts(command.options)
    var argv = minimist(args.slice(paramsIndex), cliclopts.options())
    var restArgs = argv._
    delete argv._
    try {
      var oldCWD = new URL(this.cwd.toString())
      this.outputHeader(oldCWD, inputValue)

      var additionalOutput = []
      this.outputHist.push(additionalOutput)

      let getCWD = () => this.cwd
      let setCWD = this.setCWD.bind(this)
      let ctx = {
        get cwd () { return getCWD() },
        set cwd (v) { setCWD(v) },
        resolve: this.resolve.bind(this),
        out: (...args) => {
          args = args.map(arg => {
            if (arg && typeof arg === 'object' && !(arg instanceof TemplateResult)) { 
              return JSON.stringify(arg)
            }
            return arg
          })
          let argsSpaced = []
          for (let i = 0; i < args.length - 1; i++) {
            argsSpaced.push(args[i])
            argsSpaced.push(' ')
          }
          argsSpaced.push(args[args.length - 1])
          additionalOutput.push(html`<div class="entry">${argsSpaced}</div>`)
          this.requestUpdate() 
        }
      }

      var res = command.fn.call(ctx, argv, ...restArgs)
      this.output(res)
    } catch (err) {
      this.outputError('Command error', err)
    }
    this.readTabCompletionOptions()
  }

  setFocus () {
    this.shadowRoot.querySelector('.prompt input').focus()
  }

  isFSRoot (url) {
    let a = (url || '').match(DAT_KEY_REGEX)
    let b = this.fs.url.match(DAT_KEY_REGEX)
    return a && a[0] === b[0]
  }

  lookupCommand (input) {
    let cmd = undefined
    for (let token of input.split(' ')) {
      let next = cmd ? (cmd.subcommands ? cmd.subcommands[token] : undefined) : this.commands[token]
      if (!next) break
      cmd = next
    }
    return cmd
  }

  async readTabCompletionOptions () {
    var input = this.promptInput
    var cmd = this.lookupCommand(input)

    if (cmd && !cmd.subcommands) {
      // resolve input + pwd to a directory
      let location = this.resolve(input.split(' ').pop())
      let lp = new URL(location)
      if (lp.pathname && !lp.pathname.endsWith('/')) {
        lp.pathname = lp.pathname.split('/').slice(0, -1).join('/')
      }

      // read directory
      this.tabCompletion = await (createArchive(lp.origin).readdir(lp.pathname, {stat: true}).catch(err => []))
      this.tabCompletion.sort((a, b) => {
        if (a.stat.isDirectory() && !b.stat.isDirectory()) return -1
        if (!a.stat.isDirectory() && b.stat.isDirectory()) return 1
        return a.name.localeCompare(b.name)
      })

      // get live help on the current command
      this.liveHelp = this.help({}, ...cmd.path)
    } else if (input) {
      // display command options
      if (cmd && cmd.subcommands && input.includes(' ')) {
        this.tabCompletion = Object.values(cmd.subcommands)
      } else {
        this.tabCompletion = Object.values(this.commands)
      }
      this.liveHelp = undefined
    } else {
      // no input
      this.tabCompletion = undefined
      this.liveHelp = undefined
    }

    if (this.tabCompletion) {
      let endOfInput = input.split(' ').pop().split('/').pop()
      this.tabCompletion = this.tabCompletion.filter(item => {
        return item.name.startsWith(endOfInput)
      })
    }

    this.requestUpdate()
  }

  triggerTabComplete (name) {
    var inputParts = this.promptInput.split(' ')
    var endOfInput = inputParts.pop()
    if (!name) {
      if (!this.tabCompletion || this.tabCompletion.length !== 1) return
      if (endOfInput.length === 0) return
      
      // splice the name into the end of the input (respect slashes)
      var endOfInputParts = endOfInput.split('/')
      endOfInput = endOfInputParts.slice(0, -1).concat([this.tabCompletion[0].name]).join('/')
      if (this.tabCompletion[0].stat && this.tabCompletion[0].stat.isDirectory()) {
        // add a trailing slash for directories
        endOfInput += '/'
      }

      inputParts.push(endOfInput)
    } else {
      inputParts.push(name)
    }
    this.shadowRoot.querySelector('.prompt input').value = inputParts.join(' ')
  }

  // userland-facing methods
  // =

  resolve (location) {
    const cwd = this.cwd

    // home
    if (location.startsWith('~')) {
      location = joinPath(this.fs.url, location.slice(1))
    }

    // relative paths
    if (location === '.') {
      return cwd.toString()
    }
    if (location.startsWith('./')) {
      location = location.slice(2) // remove starting ./
    }
    if (!location.startsWith('/') && !location.includes('://')) {
      location = joinPath(cwd.pathname, location)
    }

    if (!location.includes('://')) {
      // .. up navs
      let parts = location.split('/')
      for (let i = 0; i < parts.length; i++) {
        if (parts[i] === '..') {
          if (parts[i - 1]) {
            // remove parent
            parts.splice(i - 1, 1)
            i--
          }
          // remove '..'
          parts.splice(i, 1)
          i--
        }
      }
      location = parts.join('/')
      location = joinPath(cwd.origin, location)
    }

    return location
  }

  help (opts, ...topic) {
    var commands = []
    var sourceSet
    var commandNameLen = 0
    var includeDetails = false

    var cmd = undefined
    if (topic[0]) {
      cmd = this.lookupCommand(topic.join(' '))
      if (!cmd) throw new Error(`Not a command: ${topic.join(' ')}`)
    }

    if (cmd) {
      if (cmd.subcommands) {
        sourceSet = cmd.subcommands
      } else {
        sourceSet = {[topic.join(' ')]: cmd}
        includeDetails = true
      }
    } else {
      sourceSet = this.commands
    }

    for (let command of Object.values(sourceSet)) {
      commandNameLen = Math.max(command.name.length, commandNameLen)
      commands.push(command)
    }

    return {
      commands,
      toHTML () {
        return commands
          .map(command => {
            var summary = html`
              <strong style="white-space: pre">${command.name.padEnd(commandNameLen + 2)}</strong>
              ${command.help || ''}
              <small class="color-gray">package: ${command.package}</small>
              <br>
            `
            if (!includeDetails || (!command.usage && !command.options)) return summary
            var cliclopts = new Cliclopts(command.options)

            return html`${summary}<br>Usage: ${command.usage || ''}<br><pre>${cliclopts.usage()}</pre>`
          })
      }
    }
  }

  // rendering
  // =

  render () {
    if (!this.cwd) return html`<div></div>`
    var host = this.isFSRoot(this.cwd.host) ? '~' : shortenHash(this.cwd.host)
    var pathname = shortenAllKeys(this.cwd.pathname).replace(/\/$/, '')
    var additionalTabCompleteOptions = this.tabCompletion ? this.tabCompletion.length - TAB_COMPLETION_RENDER_LIMIT : 0
    let endOfInput = this.promptInput.split(' ').pop().split('/').pop()
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper" @keydown=${this.onKeyDown}>
        <div class="output">
          ${this.outputHist}
        </div>
        <div class="prompt">
          ${host}${pathname}&gt; <input @keyup=${this.onPromptKeyUp} />
        </div>
        <div class="floating-help-outer">
          <div class="floating-help-inner">
            ${this.tabCompletion && this.tabCompletion.length ? html`
              <div class="tab-completion">
                ${repeat(this.tabCompletion.slice(0, TAB_COMPLETION_RENDER_LIMIT), item => {
                  // highlight the part of the name that matches the input
                  let name = item.name
                  if (name.startsWith(endOfInput)) {
                    name = html`<strong>${endOfInput}</strong>${name.slice(endOfInput.length)}`
                  }

                  const onClick = e => {
                    if (item.stat) this.triggerTabComplete(item.name + (item.stat.isDirectory() ? '/' : ''))
                    this.setFocus()
                  }

                  if (item.stat) {
                    var type = item.stat.isDirectory() ? 'folder' : 'file'
                    return html`<a @click=${onClick}><term-icon icon=${type}></term-icon> ${name}</a>`
                  } else {
                    return html`<span><span>${name}</span> <small class="color-gray">${item.help || ''}</small></span>`
                  }
                })}
                ${additionalTabCompleteOptions >= 1 ? html`<a>${additionalTabCompleteOptions} other items...</a>` : ''}
              </div>
            ` : ''}
            <div class="live-help">${this.liveHelp ? this.liveHelp.toHTML() : ''}</div>
          </div>
        </div>
      </div>
    `
  }

  updated () {
    this.scrollTo(0, this.scrollHeight)
    setTimeout(() => this.scrollTo(0, this.scrollHeight), 100)
    // run a second time after 100ms for image loads (hacky, I know)
  }

  // events
  // =

  onKeyDown (e) {
    this.setFocus()
    if (e.code === 'KeyL' && e.ctrlKey) {
      e.preventDefault()
      this.clearHistory()
    } else if (e.code === 'ArrowUp' || (e.code === 'KeyP' && e.ctrlKey)) {
      e.preventDefault()
      this.shadowRoot.querySelector('.prompt input').value = this.commandHist.prevUp()
    } else if (e.code === 'ArrowDown' || (e.code === 'KeyN' && e.ctrlKey)) {
      e.preventDefault()
      this.shadowRoot.querySelector('.prompt input').value = this.commandHist.prevDown()
    } else if (e.code === 'Escape') {
      e.preventDefault()
      this.shadowRoot.querySelector('.prompt input').value = ''
      this.commandHist.reset()
    } else if (e.code === 'Tab') {
      e.preventDefault()
      this.triggerTabComplete()
    }
  }

  onPromptKeyUp (e) {
    if (e.code === 'Enter') {
      this.evalPrompt()
    } else {
      this.readTabCompletionOptions()
    }
  }
}

customElements.define('web-term', WebTerm)

// helpers
//

function shortenHash (str = '') {
  return str.replace(/[0-9a-f]{64}/ig, v => `${v.slice(0, 6)}..${v.slice(-2)}`)
}

function subcommandsMap (pkg, commandModule, command) {
  if (!command.subcommands || !Array.isArray(command.subcommands)) {
    return undefined
  }
  let subcommands = {}
  for (let subcmd of command.subcommands) {
    subcommands[subcmd.name] = {
      fn: commandModule[command.name][subcmd.name],
      package: pkg.name || pkg.url,
      name: subcmd.name,
      path: [command.name, subcmd.name],
      help: subcmd.help,
      usage: subcmd.usage,
      options: subcmd.options,
    }
  }
  return subcommands
}