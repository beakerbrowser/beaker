import { LitElement, html, TemplateResult } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import { unsafeHTML } from '../../../app-stdlib/vendor/lit-element/lit-html/directives/unsafe-html.js'
import minimist from '../lib/minimist.1.2.0.js'
import { Cliclopts } from '../lib/cliclopts.1.1.1.js'
import { createArchive } from '../lib/term-archive-wrapper.js'
import { importModule } from '../lib/import-module.js'
import { joinPath, DAT_KEY_REGEX, makeSafe } from '../../../app-stdlib/js/strings.js'
import terminalCSS from '../../css/views/terminal.css.js'
import '../lib/term-icon.js'

const THEME_PATH = '/Terminal/theme.css'
const COMMANDS_PATH = '/Terminal/commands'

window.addEventListener('keydown', onGlobalKeydown)

class WebTerm extends LitElement {
  static get properties () {
    return {
      startUrl: {type: String, attribute: 'url'}
    }
  }

  static get styles () {
    return [terminalCSS]
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

    var getCWD = () => this.cwd
    var setCWD = this.setCWD.bind(this)
    window.terminal = {
      get cwd () {
        return getCWD()
      },
      set cwd (v) {
        return setCWD(v)
      },
      resolve: this.resolve.bind(this)
    }

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

    this.addEventListener('click', e => {
      if (e.path[0] === this) {
        // click outside of any content, focus the cli
        this.setFocus()
      }
    })
  }

  async attributeChangedCallback (name, oldval, newval) {
    super.attributeChangedCallback(name, oldval, newval)
    if (name === 'url') {
      if (!this.url) {
        if (this.startUrl.startsWith('dat://')) {
          // adopt starting url
          this.url = this.startUrl
        } else {
          // default to home if not looking at a dat
          this.url = (await navigator.filesystem.get()).url
        }
      }
      this.load()
    }
  }

  async load () {
    if (!this.fs) {
      this.fs = await navigator.filesystem.get()
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
      await this.appendOutput(html`<div><strong>Welcome to webterm 1.0.</strong> Type <code>help</code> if you get lost.</div>`, this.cwd.pathname)
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
    var packageNames = []
    try { packageNames = await this.fs.readdir(COMMANDS_PATH) }
    catch (err) {
      this.appendError(`Failed to read commands directory at ${COMMANDS_PATH}`, err)
    }
    for (let packageName of packageNames) {
      let manifest
      try {
        manifest = JSON.parse(await this.fs.readFile(joinPath(COMMANDS_PATH, packageName, 'dat.json')))
      } catch (err) {
        this.appendError(`Failed to read manifest of command: ${packageName}`, err)
        continue
      }

      if (manifest.type !== 'unwalled.garden/command-package') {
        this.appendError(`Skipping ${packageName}, not a command package (type is ${manifest.type}, should be unwalled.garden/command-package)`)
        continue
      }

      let config = manifest['unwalled.garden/command-package']
      if (!config || !config.commands || !Array.isArray(config.commands) || config.commands.length === 0) {
        this.appendError(`Skipping ${packageName}, no commands found`)
        continue
      }

      try {
        // HACK we use importModule() instead of import() because I could NOT get rollup to leave dynamic imports alone -prf
        this.commandModules[packageName] = await importModule(joinPath(this.fs.url, COMMANDS_PATH, packageName, 'index.js'))
      } catch (err) {
        this.appendError(`Failed to load ${packageName} index.js`, err)
        continue
      }

      for (let command of config.commands) {
        if (!command.name) continue
        let fullName = `${packageName}.${command.name}`
        let commandData = {
          package: packageName,
          name: command.name,
          help: command.help,
          usage: command.usage,
          options: command.options
        }
        this.commands[fullName] = commandData
        if (!(command.name in this.commands)) {
          this.commands[command.name] = commandData
        }
      }
    }
  }

  async loadBuiltins () {
    this.commandModules.builtins = {help: this.help.bind(this)}
    this.commands.help = {
      package: 'builtins',
      name: 'help'
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

  async appendOutput (output, thenCWD, cmd) {
    // create the place in the history
    var outputHistIndex = this.outputHist.length
    this.outputHist.push(html``)

    // show a spinner for promises
    if (output instanceof Promise) {
      this.outputHist.splice(outputHistIndex, 1, html`
        <div class="entry">
          <div class="entry-header">${this.isFSRoot(thenCWD.host) ? '~' : shortenHash(thenCWD.host)}${thenCWD.pathname}&gt; ${cmd || ''}</div>
          <div class="entry-content"><span class="spinner"></span></div>
        </div>
      `)
      this.requestUpdate()

      try {
        output = await output
      } catch (err) {
        output = html`<div class="error"><div class="error-header">Command error</div><div class="error-stack">${err.toString()}</div></div>`
      }
    }

    // finished, render/replace with final output
    if (typeof output === 'undefined') {
      output = 'Ok.'
    } else if (output.toHTML) {
      output = unsafeHTML(output.toHTML())
    } else if (typeof output !== 'string' && !(output instanceof TemplateResult)) {
      output = JSON.stringify(output).replace(/^"|"$/g, '')
    }
    thenCWD = thenCWD || this.cwd
    this.outputHist.splice(outputHistIndex, 1, html`
      <div class="entry">
        <div class="entry-header">${this.isFSRoot(thenCWD.host) ? '~' : shortenHash(thenCWD.host)}${thenCWD.pathname}&gt; ${cmd || ''}</div>
        <div class="entry-content">${output}</div>
      </div>
    `)
    this.requestUpdate()
  }

  appendError (msg, err, thenCWD, cmd) {
    this.appendOutput(
      html`<div class="error"><div class="error-header">${msg}</div><div class="error-stack">${err.toString()}</div></div>`,
      thenCWD,
      cmd
    )
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
    prompt.value = ''

    var commandName = args[0]
    var command = this.commands[commandName]
    if (!command) {
      this.appendError(`Command not found: ${commandName}`, '', this.cwd, commandName)
      return false
    }

    var cliclopts = new Cliclopts(command.options)
    var argv = minimist(args.slice(1), cliclopts.options())
    var restArgs = argv._
    delete argv._
    try {
      var oldCWD = new URL(this.cwd.toString())
      var res = this.commandModules[command.package][command.name](argv, ...restArgs)
      this.appendOutput(res, oldCWD, inputValue)
    } catch (err) {
      this.appendError('Command error', err, oldCWD, inputValue)
    }
  }

  setFocus () {
    this.shadowRoot.querySelector('.prompt input').focus()
  }

  isFSRoot (url) {
    let a = (url || '').match(DAT_KEY_REGEX)
    let b = this.fs.url.match(DAT_KEY_REGEX)
    return a && a[0] === b[0]
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

  help (opts, topic) {
    var commands = []
    var sourceSet
    var commandNameLen = 0
    const includeDetails = !!topic

    if (topic) {
      if (!(topic in this.commands)) {
        throw new Error(`Not a command: ${topic}`)
      }
      sourceSet = {[topic]: this.commands[topic]}
    } else {
      sourceSet = this.commands
    }

    for (let id in sourceSet) {
      if (id === 'help' || (!topic && id.includes('.'))) continue
      commandNameLen = Math.max(this.commands[id].name.length, commandNameLen)
      commands.push(this.commands[id])
    }

    return {
      commands,
      toHTML () {
        return commands
          .map(command => {
            var summary = `<strong>${makeSafe(command.name).padEnd(commandNameLen + 2)}</strong> ${makeSafe(command.help || '')} <small class="color-gray">package: ${makeSafe(command.package)}</small>`
            if (!includeDetails || (!command.usage && !command.options)) return summary
            var cliclopts = new Cliclopts(command.options)

            return `${summary}\n\nUsage: ${makeSafe(command.usage || '')}\n${makeSafe(cliclopts.usage())}`
          })
          .join('\n')
      }
    }
  }

  // rendering
  // =

  render () {
    if (!this.cwd) return html`<div></div>`
    var host = this.isFSRoot(this.cwd.host) ? '~' : shortenHash(this.cwd.host)
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper" @keydown=${this.onKeyDown}>
        <div class="output">
          ${this.outputHist}
        </div>
        <div class="prompt">
          ${host}${this.cwd.pathname}&gt; <input @keyup=${this.onPromptKeyUp} />
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
    }
  }

  onPromptKeyUp (e) {
    if (e.code === 'Enter') {
      this.evalPrompt()
    }
  }
}

customElements.define('web-term', WebTerm)

// helpers
//

function shortenHash (str = '') {
  return str.replace(/[0-9a-f]{64}/ig, v => `${v.slice(0, 6)}..${v.slice(-2)}`)
}

function onGlobalKeydown (e) {
  var webTerm = document.body.querySelector('sidebar-app').shadowRoot.querySelector('web-term')
  if (!webTerm) return
  if (e.key.match(/^[\d\w]$/i) && !e.ctrlKey && !e.metaKey) {
    // text written, focus the cli
    webTerm.setFocus()
  }
}