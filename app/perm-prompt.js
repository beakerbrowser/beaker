import { LitElement, html, css } from './vendor/lit-element/lit-element'
import prettyHash from 'pretty-hash'
import * as bg from './perm-prompt/bg-process-rpc'
import PERMS from './lib/perms'
import { getPermId, getPermParam, shorten } from './lib/strings'
import buttonsCSS from './perm-prompt/buttons.css'

const IS_DAT_KEY_REGEX = /^[0-9a-f]{64}$/i

const PERM_ICONS = {
  js: 'fas fa-code',
  network: 'fas fa-cloud',
  createDat: 'fas fa-folder-open',
  modifyDat: 'fas fa-folder-open',
  deleteDat: 'fas fa-folder-open',
  media: 'fas fa-video',
  geolocation: 'fas fa-map-marked',
  notifications: 'fas fa-bell',
  midiSysex: 'fas fa-headphones',
  pointerLock: 'fas fa-mouse-pointer',
  fullscreen: 'fas fa-arrows-alt',
  download: 'fas fa-download',
  openExternal: 'fas fa-external-link-alt',
  experimentalLibrary: 'fas fa-book',
  experimentalLibraryRequestAdd: 'fas fa-upload',
  experimentalLibraryRequestRemove: 'fas fa-times',
  experimentalGlobalFetch: 'fas fa-download',
  experimentalDatPeers: 'fas fa-exchange-alt',
  experimentalCapturePage: 'fas fa-camera'
}

class PermPrompt extends LitElement {
  constructor () {
    super()
    this.resolve = null
    this.url = null
    this.permId = null
    this.permParam = null
    this.permOpts = null
    this.isPermExperimental = false

    // export interface
    window.runPrompt = this.runPrompt.bind(this)
  }

  async runPrompt ({permission, url, opts}) {
    // lookup the perm description. auto-deny if it's not a known perm.
    this.url = url
    this.permId = getPermId(permission)
    this.permParam = getPermParam(permission)
    this.permOpts = opts || {}
    const PERM = PERMS[this.permId]
    if (!PERM) return false
    this.isPermExperimental = PERM.experimental

    // fetch dat title if needed
    if (!this.permOpts.title && IS_DAT_KEY_REGEX.test(this.permParam)) {
      let archiveKey = this.permParam
      let archiveInfo
      try { archiveInfo = await bg.datArchive.getInfo(archiveKey) }
      catch (e) {/* ignore */}
      this.permOpts.title = archiveInfo && archiveInfo.title ? archiveInfo.title : prettyHash(this.permParam)
    }

    // create the prompt
    await this.requestUpdate()

    // adjust height based on rendering
    var height = this.shadowRoot.querySelector('div').clientHeight
    bg.permPrompt.resizeSelf({height})

    // setup promise
    return new Promise(resolve => {
      this.resolve = resolve
    })
  }

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper" @contextmenu=${this.onContextMenu}>
        <p>This site wants to:</p>
        <p class="perm">
          <i class="${PERM_ICONS[this.permId]}"></i>
          ${this.renderPermDesc()}
        </p>

        <div class="prompt-btns">
          <button class="btn prompt-reject" @click=${this.onClickDecision(false)}>Block</button>
          <button class="btn primary prompt-accept" @click=${this.onClickDecision(true)}>Allow</button>
        </div>

        ${this.isPermExperimental
          ? html`
            <div class="perm-experimental">
              <i class="fa fa-info-circle"></i>
              <span>This page is requesting an experimental feature. Only click 'Allow' if you trust this page.</span>
            </div>`
          : ''}
      </div>
    `
  }

  renderPermDesc () {
    switch (this.permId) {
      case 'js': return 'Run Javascript'
      case 'media': return 'Use your camera and microphone'
      case 'geolocation': return 'Know your location'
      case 'notifications': return 'Create desktop notifications'
      case 'midiSysex': return 'Access your MIDI devices'
      case 'pointerLock': return 'Lock your cursor'
      case 'fullscreen': return 'Go fullscreen'
      case 'openExternal': return `Open this URL in another program: ${shorten(this.url, 128)}`
      case 'experimentalLibrary': return 'Read and modify your Library'
      case 'experimentalDatPeers': return 'Send and receive messages with peers'

      case 'network':
        if (this.permParam === '*') return 'Access the network freely'
        return 'contact ' + this.permParam
        
      case 'download':
        return html`<span>Download ${this.permOpts.filename}</span>`

      case 'createDat':
        if (this.permOpts.title) return `Create a new Dat archive, "${this.permOpts.title}"`
        return 'Create a new Dat archive'

      case 'modifyDat':
        {
          let viewArchive = () => bg.permPrompt.createTab('beaker://library/' + this.permParam)
          return html`<span>Write files to <a @click=${viewArchive}>${this.permOpts.title}</a></span>`
        }

      case 'deleteDat':
        {
          let viewArchive = () => bg.permPrompt.createTab('beaker://library/' + this.permParam)
          return html`<span>Delete the archive <a @click=${viewArchive}>${this.permOpts.title}</a></span>`
        }

      case 'experimentalLibraryRequestAdd':
        {
          let viewArchive = () => bg.permPrompt.createTab('beaker://library/' + this.permParam)
          return html`<span>Seed <a @click=${viewArchive}>${this.permOpts.title}</a></span>`
        }

      case 'experimentalLibraryRequestRemove':
        {
          let viewArchive = () => bg.permPrompt.createTab('beaker://library/' + this.permParam)
          return html`<span>Stop seeding <a @click=${viewArchive}>${this.permOpts.title}</a></span>`
        }

      case 'experimentalGlobalFetch':
        {
          let viewPage = () => bg.permPrompt.createTab(this.permParam)
          return html`<span>Fetch data from <a @click=${viewPage}>${this.permParam}</a></span>`
        }

      case 'experimentalCapturePage':
        {
          let viewPage = () => bg.permPrompt.createTab(this.permParam)
          return html`<span>Take a screenshot of <a @click=${viewPage}>${this.permParam}</a></span>`
        }
    }
  }

  onContextMenu (e) {
    e.preventDefault() // disable context menu
  }
  
  onClickDecision (v) {
    return e => this.resolve(v)
  }
}
PermPrompt.styles = [buttonsCSS, css`
.wrapper {
  padding: 16px;
}

a {
  cursor: pointer;
  color: blue;
}

a:hover {
  text-decoration: underline;
}

p {
  margin-top: 0;
  font-weight: 500;
  font-size: 12.5px;
  word-break: break-word;
}

p.perm {
  font-weight: 400;
}

p.perm::first-letter {
  text-transform: uppercase;
}

p.perm i {
  margin-right: 3px;
  color: #777;
  font-size: 13px;
}

.perm-experimental {
  display: flex;
  background: #dfe8fa;
  color: #335291;
  font-size: 12.5px;
  padding: 10px;
  margin: 15px -15px -15px;
}

.perm-experimental i {
  color: #335291;
  padding-right: 8px;
  padding-top: 5px;
}

.prompt-btns {
  text-align: right;
}

.prompt-btns button {
  margin-left: 5px;
}
`]

customElements.define('perm-prompt', PermPrompt)
