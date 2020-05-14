/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'
import inputsCSS from './inputs.css'
import buttonsCSS from './buttons2.css'
import { joinPath } from '../../lib/strings'

class ShareMenu extends LitElement {
  static get properties () {
    return {
      hasCopied: {type: Boolean}
    }
  }

  static get styles () {
    return [commonCSS, inputsCSS, buttonsCSS, css`
    .wrapper {
      position: relative;
      box-sizing: border-box;
      padding: 12px;
      color: #333;
      background: #fff;
      overflow: hidden;
    }

    h4 {
      margin: 0 0 8px;
    }

    .ctrl {
      display: flex;
      align-items: center;
    }

    .ctrl button {
      height: 30px;
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
      border-right: 0;
      cursor: pointer;
    }

    .ctrl input {
      flex: 1;
      border-top-left-radius: 0;
      border-bottom-left-radius: 0;
      box-shadow: none !important;
      border-color: rgba(41, 95, 203, 0.8);
    }

    .copied-notice {
      position: absolute;
      z-index: 1;
      top: 12px;
      right: 12px;
      background: rgba(0, 0, 0, 0.7);
      color: #fff;
      padding: 2px 7px;
      font-size: 10px;
      border-radius: 4px;
      box-shadow: 0 1px 3px rgba(0,0,0,.2);
      text-shadow: 0 1px 3px rgba(0,0,0,.9);
    }
    `]
  }

  constructor () {
    super()
    this.reset()
  }

  reset () {
    this.url = undefined
    this.canShare = undefined
    this.hasCopied = false
  }

  async init (params) {
    var shareableUrl = undefined
    if (params.url.startsWith('hyper://')) {
      // establish the shareable url
      try {
        let driveInfo
        let urlp = new URL(params.url)
        let pathParts = urlp.pathname.split('/').filter(Boolean)
        let pathAcc = []
               
        // find the drive that owns the location
        while (pathParts.length > 0) {
          let st = await bg.hyperdrive.stat(joinPath(urlp.origin, pathParts.join('/')))
          if (st.mount) {
            driveInfo = await bg.hyperdrive.getInfo(st.mount.key)
            break
          }
          pathAcc.unshift(pathParts.pop())
        }
        if (!driveInfo) {
          driveInfo = await bg.hyperdrive.getInfo(urlp.origin)
        }

        // make sure it can be shared
        if (driveInfo && driveInfo.url !== 'hyper://system/') {
          shareableUrl = driveInfo.url + '/' + pathAcc.join('/') + urlp.search + urlp.hash
        }
      } catch (e) {
        console.debug(e)
      }
    } else {
      // can always share as-is
      shareableUrl = params.url
    }

    this.canShare = !!shareableUrl
    this.url = shareableUrl
    await this.requestUpdate()

    // focus and highlight input
    if (this.canShare) {
      var input = this.shadowRoot.querySelector('input[type=text]')
      input.focus()
      input.setSelectionRange(0, input.value.length)
    }
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        ${this.canShare ? html`
          ${this.hasCopied ? html`<span class="copied-notice">Copied to your clipboard</span>` : ''}
          <h4>Share this location</h4>
          <p>Anyone with the link can view this location.</p>
          <div class="ctrl">
            <button class="primary" @click=${this.onClickCopy}><span class="fas fa-fw fa-copy"></span> Copy</button>
            <input type="text" value="${this.url}" @keypress=${e => e.preventDefault()} />
          </div>
        ` : html`
          <h4>Share this location</h4>
          <div><span class="fas fa-fw fa-lock"></span> This location is private and cannot be shared.</div>
        `}
      </div>
    `
  }

  // events
  // =

  onClickCopy () {
    var input = this.shadowRoot.querySelector('input')
    input.select()
    document.execCommand('copy')
    this.hasCopied = true

    setTimeout(() => {
      this.hasCopied = false
    }, 1e3)
  }
}

customElements.define('share-menu', ShareMenu)
