/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import _get from 'lodash.get'
import * as bg from './bg-process-rpc'
import {writeToClipboard} from '../lib/fg/event-handlers'
import commonCSS from './common.css'

class SiteToolsMenu extends LitElement {
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
        <div class="menu-item" @click=${this.onClickViewSource}>
          <i class="fas fa-code"></i>
          View source
        </div>
        <div class="menu-item" @click=${this.onClickFork}>
          <i class="fas fa-code-branch"></i>
          Fork this site
        </div>
        <hr>
        <div class="menu-item" @click=${this.onToggleLiveReloading}>
          <i class="fa fa-bolt"></i>
          Toggle live reloading
        </div>
        <hr>
        <div class="menu-item" @click=${this.onClickOpenFolder}>
          <i class="far fa-folder-open"></i>
          Open folder
        </div>
        <div class="menu-item" @click=${this.onClickCopyPath}>
          <i class="fa fa-clipboard"></i>
          Copy path
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

  onClickViewSource () {
    bg.shellMenus.createTab(`beaker://editor/dat://${this.datInfo.key}`)
    bg.shellMenus.close()
  }

  async onClickFork () {
    bg.shellMenus.close()
    const forkUrl = await bg.datArchive.forkArchive(this.datInfo.key, {prompt: true}).catch(() => false)
    if (forkUrl) {
      bg.shellMenus.loadURL(`beaker://editor/${forkUrl}`)
    }
  }

  onToggleLiveReloading () {
    bg.shellMenus.close()
    bg.views.toggleLiveReloading('active')
  }
}
SiteToolsMenu.styles = [commonCSS, css`
.wrapper {
  padding: 4px 0;
}
`]

customElements.define('site-tools-menu', SiteToolsMenu)
