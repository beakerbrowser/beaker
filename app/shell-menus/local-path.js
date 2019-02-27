import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import _get from 'lodash.get'
import * as bg from './bg-process-rpc'
import {writeToClipboard} from '../lib/fg/event-handlers'
import commonCSS from './common.css'

class LocalPathMenu extends LitElement {
  static get properties () {
    return {
      url: {type: String}
    }
  }

  constructor () {
    super()
    this.reset()
  }

  reset () {
    this.datInfo = null
  }

  async init (params) {
    this.datInfo = (await bg.views.getTabState('active', {datInfo: true})).datInfo
    await this.requestUpdate()
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <div class="menu-item" @click=${this.onClickOpenFolder}>
          <i class="far fa-folder-open"></i>
          Open folder
        </div>
        <div class="menu-item" @click=${this.onClickCopyPath}>
          <i class="fa fa-clipboard"></i>
          Copy path
        </div>
        <hr />
        <div class="menu-item" @click=${this.onClickConfigure}>
          <i class="fa fa-wrench"></i>
          Configure
        </div>
      </div>
    `
  }

  // events
  // =

  onClickOpenFolder () {
    bg.shellMenus.close()
    const localSyncPath = _get(this, 'datInfo.userSettings.localSyncPath')
    if (!localSyncPath) return
    bg.beakerBrowser.openFolder(localSyncPath)
  }

  onClickCopyPath () {
    bg.shellMenus.close()
    const localSyncPath = _get(this, 'datInfo.userSettings.localSyncPath')
    if (!localSyncPath) return
    writeToClipboard(localSyncPath)
  }

  onClickConfigure () {
    bg.shellMenus.createTab(`beaker://library/dat://${this.datInfo.key}#settings`)
    bg.shellMenus.close()
  }
}
LocalPathMenu.styles = [commonCSS, css`
.wrapper {
  padding: 4px 0;
}
`]

customElements.define('local-path-menu', LocalPathMenu)
