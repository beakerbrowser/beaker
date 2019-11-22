import { LitElement, html, TemplateResult } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { unsafeHTML } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/unsafe-html.js'
import minimist from './lib/minimist.1.2.0.js'
import { Cliclopts } from './lib/cliclopts.1.1.1.js'
import { createArchive } from './lib/term-archive-wrapper.js'
import { importModule } from './lib/import-module.js'
import { joinPath, DAT_KEY_REGEX, makeSafe } from 'beaker://app-stdlib/js/strings.js'
import css from '../css/main.css.js'
import './lib/term-icon.js'

const THEME_PATH = '/settings/terminal.css'
const TAB_COMPLETION_RENDER_LIMIT = 15

window.addEventListener('keydown', onGlobalKeydown)

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

    this.url = navigator.filesystem.url
    window.sidebarLoad = (url) => {
      this.url = url
      this.classList.add('sidebar')
      this.load()
    }

    this.load()
  }

  get promptInput () {
    try { return this.shadowRoot.querySelector('.prompt input').value }
    catch (e) { return '' }
  }

  async load () {
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
    var packages = await beaker.programs.listPrograms({type: 'webterm.sh/cmd-pkg'})
    console.log(packages)
    for (let pkg of packages) {
      var commands = pkg.manifest.commands
      if (!commands || !Array.isArray(commands) || commands.length === 0) {
        this.appendError(`Skipping ${pkg.manifest.title} (${pkg.url})`, 'No commands found')
        continue
      }

      try {
        // HACK we use importModule() instead of import() because I could NOT get rollup to leave dynamic imports alone -prf
        this.commandModules[pkg.url] = await importModule(joinPath(pkg.url, 'index.js'))
      } catch (err) {
        this.appendError(`Failed to load ${pkg.manifest.title} (${pkg.url}) index.js`, err)
        continue
      }

      for (let command of commands) {
        if (!command.name) continue
        let commandData = {
          package: pkg.url,
          name: command.name,
          help: command.help,
          usage: command.usage,
          options: command.options
        }
        if (!(command.name in this.commands)) {
          this.commands[command.name] = commandData
        } else {
          this.appendError(`Unabled to add ${command.name} from ${pkg.manifest.title}`, 'Command name already in use')
        }
      }
    }
  }

  async loadBuiltins () {
    this.commandModules.builtins = {help: this.help.bind(this)}
    this.commands.help = {
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
      output = ''
    } else if (output.toHTML) {
      output = unsafeHTML(output.toHTML())
    } else if (typeof output !== 'string' && !(output instanceof TemplateResult)) {
      output = JSON.stringify(output)
    }
    thenCWD = thenCWD || this.cwd
    this.outputHist.splice(outputHistIndex, 1, html`
      <div class="entry">
        <div class="entry-header">${this.isFSRoot(thenCWD.host) ? '~' : shortenHash(thenCWD.host)}${thenCWD.pathname}&gt; ${cmd || ''}</div>
        <div class="entry-content">${output}</div>
      </div>
    `)

    await this.readTabCompletionOptions()
    this.requestUpdate()
  }

  appendError (msg, err, thenCWD, cmd) {
    this.appendOutput(
      html`<div class="error"><div class="error-header">${msg}</div><div class="error-stack">${err ? err.toString() : ''}</div></div>`,
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

  async readTabCompletionOptions () {
    var input = this.promptInput

    if (input.includes(' ')) {
      // resolve input + pwd to a directory
      let location = this.resolve(input.split(' ').pop())
      let lp = new URL(location)
      if (lp.pathname && !lp.pathname.endsWith('/')) {
        lp.pathname = lp.pathname.split('/').slice(0, -1).join('/')
      }

      // read directory
      this.tabCompletion = await (createArchive(lp.origin)).readdir(lp.pathname, {stat: true})
      this.tabCompletion.sort((a, b) => {
        if (a.stat.isDirectory() && !b.stat.isDirectory()) return -1
        if (!a.stat.isDirectory() && b.stat.isDirectory()) return 1
        return a.name.localeCompare(b.name)
      })

      // get live help on the current command
      this.liveHelp = this.help({}, input.split(' ').shift())
    } else if (input) {
      // display command options
      this.tabCompletion = this.help().commands
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
      if (!topic && id.includes('.')) continue
      let command = this.commands[id]
      commandNameLen = Math.max(command.name.length, commandNameLen)
      commands.push(command)
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
    var additionalTabCompleteOptions = this.tabCompletion ? this.tabCompletion.length - TAB_COMPLETION_RENDER_LIMIT : 0
    let endOfInput = this.promptInput.split(' ').pop().split('/').pop()
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper" @keydown=${this.onKeyDown}>
        <button class="close-btn" @click=${this.onClickClose}><span class="fas fa-times"></button>
        <div class="output">
          ${this.outputHist}
        </div>
        <div class="prompt">
          ${host}${this.cwd.pathname}&gt; <input @keyup=${this.onPromptKeyUp} />
        </div>
        ${this.tabCompletion ? html`
          <div class="tab-completion">
            ${repeat(this.tabCompletion.slice(0, TAB_COMPLETION_RENDER_LIMIT), item => {
              // highlight the part of the name that matches the input
              let name = item.name
              if (name.startsWith(endOfInput)) {
                name = html`<strong>${endOfInput}</strong>${name.slice(endOfInput.length)}`
              }

              const onClick = e => {
                if (item.stat) this.triggerTabComplete(item.name + (item.stat.isDirectory() ? '/' : ''))
                else this.appendOutput(this.help({}, item.name), this.cwd, `help ${item.name}`)
                this.setFocus()
              }

              if (item.stat) {
                var type = item.stat.isDirectory() ? 'folder' : 'file'
                return html`<a @click=${onClick}><term-icon icon=${type}></term-icon> ${name}</a>`
              } else {
                return html`<a @click=${onClick}><span>${name}</span> <small class="color-gray">${item.help || ''}</small></a>`
              }
            })}
            ${additionalTabCompleteOptions >= 1 ? html`<a>${additionalTabCompleteOptions} other items...</a>` : ''}
          </div>
        ` : ''}
        <div class="live-help">${this.liveHelp ? unsafeHTML(this.liveHelp.toHTML()) : ''}</div>
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

  onClickClose (e) {
    beaker.browser.toggleSidebar()
  }

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

function onGlobalKeydown (e) {
  var webTerm = document.body.querySelector('web-term')
  if (!webTerm) return
  if (e.key.match(/^[\d\w]$/i) && !e.ctrlKey && !e.metaKey) {
    // text written, focus the cli
    webTerm.setFocus()
  }
}