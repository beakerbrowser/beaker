/* globals customElements */
import { PERMS, PERM_ICONS, renderPermDesc, getPermId, getPermParam } from '../../lib/permissions'
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import prettyHash from 'pretty-hash'
import * as bg from './bg-process-rpc'
import buttonsCSS from './buttons.css'

const IS_DRIVE_KEY_REGEX = /^[0-9a-f]{64}$/i

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
    window.isPromptActive = false
    window.runPrompt = this.runPrompt.bind(this)
    window.clickAccept = () => this.shadowRoot.querySelector('.prompt-accept').click()
    window.clickReject = () => this.shadowRoot.querySelector('.prompt-reject').click()

    this.fetchBrowserInfo()
  }

  async fetchBrowserInfo () {
    // fetch platform information
    var {platform} = await bg.beakerBrowser.getInfo()
    window.platform = platform
    if (platform === 'darwin') {
      document.body.classList.add('darwin')
    }
    if (platform === 'win32') {
      document.body.classList.add('win32')
    }
  }

  async runPrompt ({permission, url, opts}) {
    window.isPromptActive = true

    // lookup the perm description. auto-deny if it's not a known perm.
    this.url = url
    this.permId = getPermId(permission)
    this.permParam = getPermParam(permission)
    this.permOpts = opts || {}
    const PERM = PERMS[this.permId]
    if (!PERM) return false
    this.isPermExperimental = PERM.experimental
    this.isPermDangerous = !!PERM.dangerous

    // fetch dat title if needed
    if (!this.permOpts.title && IS_DRIVE_KEY_REGEX.test(this.permParam)) {
      let driveKey = this.permParam
      let driveInfo
      try { driveInfo = await bg.hyperdrive.getInfo(driveKey) }
      catch (e) { /* ignore */ }
      this.permOpts.title = driveInfo && driveInfo.title ? driveInfo.title : prettyHash(this.permParam)
    }

    // create the prompt
    await this.requestUpdate()

    // adjust height based on rendering
    var height = this.shadowRoot.querySelector('div').clientHeight|0
    bg.permPrompt.resizeSelf({height})

    // setup promise
    return new Promise(resolve => {
      this.resolve = resolve
    }).then(v => {
      window.isPromptActive = false
      return v
    })
  }

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper" @contextmenu=${this.onContextMenu}>
        <p>This site wants to:</p>
        <p class="perm">
          <i class="${PERM_ICONS[this.permId]}"></i>
          ${renderPermDesc({bg, html, url: this.url, permId: this.permId, permParam: this.permParam, permOpts: this.permOpts})}
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
        ${this.isPermDangerous
          ? html`
            <div class="perm-experimental">
              <i class="fa fa-info-circle"></i>
              <span>Only click 'Allow' if you trust this page.</span>
            </div>`
          : ''}
      </div>
    `
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
