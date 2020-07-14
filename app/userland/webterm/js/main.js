import { LitElement, html, TemplateResult } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { render } from 'beaker://app-stdlib/vendor/lit-element/lit-html/lit-html.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { parser } from './lib/parser.js'
import { Cliclopts } from './lib/cliclopts.1.1.1.js'
import { createDrive } from './lib/term-drive-wrapper.js'
import { importModule } from './lib/import-module.js'
import { joinPath, shortenAllKeys } from 'beaker://app-stdlib/js/strings.js'
import { findParent } from 'beaker://app-stdlib/js/dom.js'
import css from '../css/main.css.js'
import './lib/term-icon.js'

// export lit-html as a window global
window.html = html
window.html.render = render

const TAB_COMPLETION_RENDER_LIMIT = 15


// Look up control/navigation keys via keycode.
//
// Taken from https://github.com/ccampbell/mousetrap/blob/2f9a476ba6158ba69763e4fcf914966cc72ef433/mousetrap.js#L39-L62,
// licensed under the Apache-2.0.
const KEYCODE_MAP = {
  8: 'backspace',
  9: 'tab',
  13: 'enter',
  16: 'shift',
  17: 'ctrl',
  18: 'alt',
  20: 'capslock',
  27: 'esc',
  32: 'space',
  33: 'pageup',
  34: 'pagedown',
  35: 'end',
  36: 'home',
  37: 'left',
  38: 'up',
  39: 'right',
  40: 'down',
  45: 'ins',
  46: 'del',
  91: 'meta',
  93: 'meta',
  224: 'meta'
}

class WebTerm extends LitElement {
  static get styles () {
    return [css]
  }

  constructor () {
    super()
    beaker.panes.setAttachable()
    this.attachedPane = undefined
    this.isLoaded = false
    this.startUrl = ''
    this._url = ''
    this.commands = {}
    this.commandModules = {}
    this.pageCommands = {}
    this.cwd = undefined
    this.outputHist = []
    this.tabCompletion = undefined
    this.liveHelp = undefined
    this.envVars = {}

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
      let anchor = findParent(e.path[0], el => el.tagName === 'A')
      if (anchor) {
        e.stopPropagation()
        e.preventDefault()
        if (e.metaKey || anchor.getAttribute('target') === '_blank') {
          window.open(anchor.getAttribute('href'))
        } else {
          if (this.attachedPane) {
            beaker.panes.navigate(this.attachedPane.id, anchor.getAttribute('href'))
          } else {
            window.location = anchor.getAttribute('href')
          }
        }
        return
      }
      if (!this.shadowRoot.activeElement && window.getSelection().type !== 'Range') {
        // clicks that are not text-selections should focus the input
        this.setFocus()
      }
    })

    beaker.panes.addEventListener('pane-attached', e => {
      this.attachedPane = beaker.panes.getAttachedPane()
      this.setCWD(this.attachedPane.url)
    })
    beaker.panes.addEventListener('pane-detached', e => {
      this.attachedPane = undefined
    })
    beaker.panes.addEventListener('pane-navigated', e => {
      this.attachedPane.url = e.detail.url
      this.setCWD(e.detail.url)
    })

    ;(async () => {
      let ctx = (new URLSearchParams(location.search)).get('url')
      if (ctx && ctx.startsWith('beaker://webterm')) ctx = undefined
      this.attachedPane = await beaker.panes.attachToLastActivePane()
      if (this.attachedPane) {
        ctx = this.attachedPane.url
      }
      this.load(ctx || 'hyper://system/').then(_ => {
        this.setFocus()
      })
    })()
  }

  teardown () {

  }

  get url () {
    return this._url
  }

  set url (v) {
    history.replaceState({}, '', `/?url=${v}`)
    this._url = v
  }

  getContext () {
    return this.url
  }

  get promptInput () {
    try { return this.shadowRoot.querySelector('.prompt input').value }
    catch (e) { return '' }
  }

  async load (url) {
    this.url = url

    var cwd = this.parseURL(this.url)
    while (cwd.pathame !== '/') {
      try {
        let st = await (createDrive(cwd.origin)).stat(cwd.pathname)
        if (st.isDirectory()) break
      } catch (e) { 
        /* ignore */
      }
      cwd.pathname = cwd.pathname.split('/').slice(0, -1).join('/')
    }
    this.cwd = cwd

    if (!this.isLoaded) {
      await this.importEnvironment()
      await this.output(html`<div><strong>Welcome to webterm 1.0.</strong> Type <code>help</code> if you get lost.</div>`)
      this.isLoaded = true
    }

    this.requestUpdate()
  }

  async importEnvironment () {
    this.commands = {}
    this.commandModules = {}
    this.pageCommands = {}
    await this.loadCommands()
    await this.loadBuiltins()
    await this.loadPageCommands()
  }

  async loadCommands () {
    var packages = [{
      url: 'beaker://std-cmds/',
      manifest: JSON.parse(await beaker.browser.readFile('beaker://std-cmds/index.json', 'utf8'))
    }]

    var cmdPkgDrives = await beaker.hyperdrive.readFile('hyper://system/webterm/command-packages.json').then(JSON.parse).catch(e => ([]))
    for (let driveUrl of cmdPkgDrives) {
      try {
        packages.push({
          url: driveUrl,
          manifest: JSON.parse(await beaker.hyperdrive.drive(driveUrl).readFile(`index.json`))
        })
      } catch (e) {
        console.log(e)
        this.outputError(`Failed to read manifest for command package (${driveUrl})`, e.toString())
      }
    }

    for (let pkg of packages) {
      var pkgId = pkg.url
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
          autocomplete: command.autocomplete,
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

  async loadPageCommands () {
    this.attachedPane = beaker.panes.getAttachedPane()
    if (!this.attachedPane) {
      this.pageCommands = {}
      return
    }
    this.pageCommands = await beaker.panes.executeJavaScript(this.attachedPane.id, `
      ;(() => {
        let commands = {}
        if (beaker.terminal.getCommands().length) {
          for (let command of beaker.terminal.getCommands()) {
            commands[command.name] = {
              package: 'page commands',
              name: '@' + command.name,
              path: ['@' + command.name],
              help: command.help,
              usage: command.usage,
              autocomplete: command.autocomplete,
              options: command.options,
              subcommands: undefined
            }
          }
        }
        return commands
      })();
    `)
    this.pageCommands = this.pageCommands || {}
  }

  setCWD (location) {
    var locationParsed
    if (location.startsWith('hyper://')) {
      try {
        locationParsed = new URL(location)
        location = `${locationParsed.host}${locationParsed.pathname}`
      } catch (err) {
        location = `${this.cwd.host}${joinPath(this.cwd.pathname, location)}`
      }
      locationParsed = new URL('hyper://' + location)
    } else {
      locationParsed = new URL(location)
    }

    if (this.url === locationParsed.toString()) {
      return
    }

    this.url = location
    this.cwd = locationParsed
    if (this.attachedPane && this.attachedPane.url !== locationParsed.toString()) {
      beaker.panes.navigate(this.attachedPane.id, locationParsed.toString())
    }
    this.requestUpdate()
  }

  parseURL (url) {
    if (!url.includes('://')) url = 'hyper://' + url
    return new URL(url)
  }

  outputHeader (thenCwd, cmd) {
    let host = shortenHash(thenCwd.host)
    let pathname = shortenAllKeys(thenCwd.pathname || '').replace(/\/$/, '')
    this.outputHist.push(html`<div class="header"><strong><a href=${thenCwd.toString()}>${host}${pathname}</a>&gt;</strong> <span>${cmd || ''}</span></div>`)
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
    if (typeof output === 'undefined' || !output) {
      output = ''
    } else if (output.toHTML) {
      output = output.toHTML()
    } else if (typeof output !== 'string' && !(output instanceof TemplateResult)) {
      output = html`<pre>${JSON.stringify(output)}</pre>`
    } else {
      output = html`<pre>${output}</pre>`
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

  getAllEnv () {
    return Object.assign({}, this.envVars, {
      cwd: this.cwd.toString()
    })
  }

  getEnv (key) {
    if (key === 'cwd') return this.cwd.toString()
    return this.envVars[key] || ''
  }

  setEnv (key, value) {
    if (key === '@') return
    if (key === 'cwd') return
    this.envVars[key] = value
  }

  applySubstitutions (inputParsed) {
    const doReplace = str => str.replace(/\$([a-z@0-9]+)/ig, (val) => {
      var key = val.slice(1).toLowerCase()
      return this.getEnv(key)
    })
    inputParsed.forEach(term => {
      if (typeof term.value === 'string') {
        term.value = doReplace(term.value)
      }
    })
  }

  toArgv (inputParsed, optsDesc) {
    var opts = {}
    var positional = []
    
    // used to map aliased names (eg -f becomes --foo)
    const resolveKey = key => {
      var match = Object.entries(optsDesc.alias).find(([longName, aliases]) => aliases.includes(key))
      return match ? match[0] : key
    }

    inputParsed.forEach(token => {
      if (token.type === 'param') {
        var key = resolveKey(token.key)
        var value = token.value

        // if a boolean arg has a non-boolean value, move the value to the positional args
        if (optsDesc.boolean.includes(key)) {
          if (typeof value !== 'boolean') {
            positional.push(value)
            value = true
          }
        }

        opts[key] = value
      } else {
        positional.push(token.value)
      }
    })

    for (let key in optsDesc.default) {
      key = resolveKey(key)
      if (typeof opts[key] === 'undefined') {
        opts[key] = optsDesc.default[key]
      }
    }

    return [opts].concat(positional)
  }

  async evalPrompt () {
    var prompt = this.shadowRoot.querySelector('.prompt input')
    if (!prompt.value.trim()) {
      return
    }
    this.commandHist.add(prompt.value)

    this.attachedPane = beaker.panes.getAttachedPane()
    this.envVars['@'] = this.attachedPane ? this.attachedPane.url : this.cwd.toString()

    var inputValue = prompt.value
    try {
      var inputParsed = parser.parse(inputValue)
    } catch (e) {
      this.outputError('There was an issue with parsing your input', e.toString(), this.cwd, inputValue)
      this.readTabCompletionOptions()
      return false
    }
    this.applySubstitutions(inputParsed)
    var paramsIndex = 1
    prompt.value = ''

    var command
    var commandName = inputParsed[0].value
    if (commandName.startsWith('@')) {
      await this.loadPageCommands()
      command = this.pageCommands[commandName.slice(1)]
      if (command) {
        command.fn = (...args) => beaker.panes.executeJavaScript(this.attachedPane.id, `
          ;(() => {
            let command = beaker.terminal.getCommands().find(c => c.name === ${JSON.stringify(commandName.slice(1))});
            if (command) {
              return command.handle.apply(command, ${JSON.stringify(args)})
            }
          })();
        `)
      }
    } else {
      command = this.commands[commandName]
      if (command && command.subcommands) {
        if (command.subcommands[inputParsed[1]?.value]) {
          command = command.subcommands[inputParsed[1].value]
          paramsIndex = 2
        } else {
          command = this.commands.help
          paramsIndex = 0
        }
      }
    }
    if (!command) {
      this.outputError('', `Command not found: ${commandName}`, this.cwd, inputValue)
      this.readTabCompletionOptions()
      return false
    }

    var cliclopts = new Cliclopts(command.options)
    var argv = this.toArgv(inputParsed.slice(paramsIndex), cliclopts.options())
    if ('h' in argv[0] || 'help' in argv[0]) {
      command = this.commands.help
      argv = [argv[0]].concat(inputParsed.slice(0, paramsIndex).map(v => v.value)).concat(argv.slice(1))
    }
    try {
      var oldCWD = new URL(this.cwd.toString())
      this.outputHeader(oldCWD, inputValue)

      var additionalOutput = []
      this.outputHist.push(additionalOutput)

      let ctx = {
        env: {
          getAll: this.getAllEnv.bind(this),
          get: this.getEnv.bind(this),
          set: this.setEnv.bind(this),
          goto: this.setCWD.bind(this),
          focus: this.setFocus.bind(this),
          resolve: this.resolve.bind(this),
          clearHistory: this.clearHistory.bind(this),
          reload: this.importEnvironment.bind(this),
          close: this.close.bind(this)
        },
        page: {
          goto (url, opts = {}) {
            if (opts.newTab) window.open(url)
            else {
              var pane = beaker.panes.getAttachedPane()
              if (!pane) throw new Error('No attached pane')
              beaker.panes.navigate(pane.id, url)
            }
          },
          refresh () {
            var pane = beaker.panes.getAttachedPane()
            if (!pane) throw new Error('No attached pane')
            beaker.panes.navigate(pane.id, pane.url)
          },
          focus () {
            var pane = beaker.panes.getAttachedPane()
            if (!pane) throw new Error('No attached pane')
            beaker.panes.focus(pane.id)
          },
          exec (js) {
            var pane = beaker.panes.getAttachedPane()
            if (!pane) throw new Error('No attached pane')
            return beaker.panes.executeJavaScript(pane.id, js)
          },
          inject (css) {
            var pane = beaker.panes.getAttachedPane()
            if (!pane) throw new Error('No attached pane')
            return beaker.panes.injectCss(pane.id, css)
          },
          uninject (id) {
            var pane = beaker.panes.getAttachedPane()
            if (!pane) throw new Error('No attached pane')
            return beaker.panes.uninjectCss(pane.id, id)
          }
        },
        out: (...args) => {
          args = args.map(arg => {
            if (arg && typeof arg === 'object' && !(arg instanceof TemplateResult) && !(arg instanceof HTMLElement)) { 
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
        },
        prompt: (txt, defValue) => {
          return new Promise((resolve, reject) => {
            const onKeydown = e => {
              if (e.code === 'Enter') {
                e.currentTarget.value = e.currentTarget.value || defValue
                resolve(e.currentTarget.value)
                e.currentTarget.setAttribute('disabled', 1)
                e.currentTarget.parentNode.classList.remove('active-prompt')
                this.setFocus()
              }
            }
            additionalOutput.push(html`<div class="entry subprompt active-prompt">
              <strong>${txt}</strong>
              ${defValue ? html`<span class="def">[${defValue}]</span>` : ''}:
              <input @keydown=${onKeydown}>
            </div>`)
            this.requestUpdate().then(() => this.setFocusSubprompt())
          })
        }
      }

      var res = command.fn.call(ctx, ...argv)
      this.output(res)
    } catch (err) {
      this.outputError('Command error', err)
    }
    this.loadPageCommands()
    this.readTabCompletionOptions()
  }

  setFocus () {
    try {
      this.shadowRoot.querySelector('.prompt input').focus()
    } catch (e) {
      this.focus()
    }
  }

  setFocusSubprompt () {
    try {
      Array.from(this.shadowRoot.querySelectorAll('.subprompt input')).pop().focus()
    } catch (e) {
      this.setFocus()
    }
  }

  close () {
    window.close()
  }

  lookupCommand (input) {
    let cmd = undefined
    if (input.startsWith('@')) {
      cmd = this.pageCommands[input.split(' ')[0].slice(1)]
    } else {
      for (let token of input.split(' ')) {
        let next = cmd ? (cmd.subcommands ? cmd.subcommands[token] : undefined) : this.commands[token]
        if (!next) break
        cmd = next
      }
    }
    return cmd
  }

  async readTabCompletionOptions () {
    this.isTabCompletionLoading = true
    var input = this.promptInput
    var cmd = this.lookupCommand(input)

    if (cmd && !cmd.subcommands && cmd.autocomplete === 'files') {
      // resolve input + pwd to a directory
      let location = this.resolve(input.split(' ').pop())
      let lp = new URL(location)
      if (lp.pathname && !lp.pathname.endsWith('/')) {
        lp.pathname = lp.pathname.split('/').slice(0, -1).join('/')
      }

      // read directory
      this.tabCompletion = await (createDrive(lp.origin).readdir(lp.pathname, {includeStats: true}).catch(err => []))
      this.tabCompletion.sort((a, b) => {
        if (a.stat.isDirectory() && !b.stat.isDirectory()) return -1
        if (!a.stat.isDirectory() && b.stat.isDirectory()) return 1
        return a.name.localeCompare(b.name)
      })

      // get live help on the current command
      if (cmd.path) {
        this.liveHelp = this.help({}, ...cmd.path)
      } else {
        this.liveHelp = this.help({})
      }
    } else if (input) {
      // display command options
      if (cmd && cmd.subcommands && input.includes(' ')) {
        this.tabCompletion = Object.values(cmd.subcommands)
      } else if (input.startsWith('@')) {
        this.tabCompletion = Object.values(this.pageCommands)
      } else if (!cmd || cmd.name === 'help') {
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

    this.isTabCompletionLoading = false
    this.requestUpdate()
  }

  triggerTabComplete (name) {
    if (this.isTabCompletionLoading) return
    var inputParts = this.promptInput.split(' ')
    var endOfInput = inputParts.pop()
    if (!name) {
      if (!this.tabCompletion || this.tabCompletion.length === 0) return
      if (endOfInput.length === 0) return

      var isDir = false
      var completion = ''
      if (this.tabCompletion.length === 1) {
        completion = this.tabCompletion[0].name
        isDir = this.tabCompletion[0].stat && this.tabCompletion[0].stat.isDirectory()
      } else {
        completion = sharedTabCompletionPrefix(this.tabCompletion)
      }
      
      // splice the name into the end of the input (respect slashes)
      var endOfInputParts = endOfInput.split('/')
      endOfInput = endOfInputParts.slice(0, -1).concat([completion]).join('/')
      if (isDir) {
        // add a trailing slash for directories
        endOfInput += '/'
      }

      inputParts.push(endOfInput)
    } else {
      inputParts.push(name)
    }
    this.shadowRoot.querySelector('.prompt input').value = inputParts.join(' ')
    this.readTabCompletionOptions()
  }

  // userland-facing methods
  // =

  resolve (location) {
    const cwd = this.cwd

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
    var heading = undefined
    var parentCmdName = ''

    var cmd = undefined
    if (topic[0]) {
      cmd = this.lookupCommand(topic.join(' '))
      if (!cmd) throw new Error(`Not a command: ${topic.join(' ')}`)
    }

    if (cmd) {
      if (cmd.subcommands) {
        parentCmdName = cmd.name + ' '
        heading = cmd.help ? html`${cmd.help || ''}<br><br>` : undefined
        sourceSet = cmd.subcommands
      } else {
        sourceSet = {[topic.join(' ')]: cmd}
        includeDetails = true
      }
    } else {
      sourceSet = this.commands
    }

    for (let command of Object.values(sourceSet)) {
      commandNameLen = Math.max(command.name.length + parentCmdName.length, commandNameLen)
      commands.push(command)
    }

    return {
      commands,
      toHTML () {
        return html`
          ${heading}
          ${commands.map(command => {
            var name = parentCmdName + command.name
            var pkg
            if (command.package.startsWith('beaker://')) {
              pkg = html`std-cmds`
            } else {
              pkg = html`<a href=${command.package} target="_blank">${shortenHash(command.package)}</a>`
            }
            var summary = html`
              <strong style="white-space: pre">${name.padEnd(commandNameLen + 2)}</strong>
              ${command.help || ''}
              <small class="color-gray">package: ${pkg}</small>
              <br>
            `
            if (!includeDetails || (!command.usage && !command.options)) return summary
            var cliclopts = new Cliclopts(command.options)

            return html`${summary}<br>Usage: ${command.usage || ''}<br><pre>${cliclopts.usage()}</pre>`
          })}
        `
      }
    }
  }

  // rendering
  // =

  render () {
    if (!this.cwd) return html`<div></div>`
    var host = shortenHash(this.cwd.host)
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
          <strong><a href=${this.cwd.toString()}>${host}${pathname}</a>&gt;</strong> <input @keyup=${this.onPromptKeyUp} />
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
    let keycode = KEYCODE_MAP[e.which];
    if (e.code === 'KeyL' && e.ctrlKey) {
      e.preventDefault()
      this.clearHistory()
    } else if ((keycode === 'up') || (e.code === 'KeyP' && e.ctrlKey)) {
      e.preventDefault()
      this.shadowRoot.querySelector('.prompt input').value = this.commandHist.prevUp()
    } else if ((keycode === 'down') || (e.code === 'KeyN' && e.ctrlKey)) {
      e.preventDefault()
      this.shadowRoot.querySelector('.prompt input').value = this.commandHist.prevDown()
    } else if ((keycode === 'esc') || (e.code === 'Escape')) {
      e.preventDefault()
      this.shadowRoot.querySelector('.prompt input').value = ''
      this.commandHist.reset()
    } else if ((keycode === 'tab') || (e.code === 'Tab')) {
      // NOTE: subtle behavior here-
      // we prevent default on keydown to maintain focus
      // we trigger tabcomplete on keyup to make sure it runs after
      // readTabCompletionOptions()
      // -prf
      e.preventDefault()
    }
  }

  onPromptKeyUp (e) {
    let keycode = KEYCODE_MAP[e.which];
    if ((keycode === 'enter') || (e.code === 'Enter')) {
      this.evalPrompt()
    } else if ((keycode === 'tab') || (e.code === 'Tab')) {
      this.triggerTabComplete()
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

function sharedTabCompletionPrefix (tabCompletionOpts) {
  var names = tabCompletionOpts.map(opt => opt.name)
  names.sort()

  var i = 0
  var first = names[0]
  var last = names[names.length - 1]
  while (i < first.length && i < last.length && first.charAt(i) === last.charAt(i)) {
    i++
  }
  return first.substring(0, i)
}
