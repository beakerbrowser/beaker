/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import _get from 'lodash.get'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'

class CreateMenu extends LitElement {
  constructor () {
    super()
    this.reset()
  }

  reset () {
    this.driveInfo = null
  }

  async init (params) {
    this.driveInfo = (await bg.views.getTabState('active', {driveInfo: true})).driveInfo
    await this.requestUpdate()
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="header"><h2>Create new</h2></div>
      <div class="wrapper">
        <div class="menu-item" @click=${e => this.onClickNew('wiki')}>
          Wiki site
        </div>
        <div class="menu-item" @click=${e => this.onClickNew()}>
          Empty website
        </div>
      </div>
    `
  }

  // events
  // =

  onClickNew (template) {
    bg.shellMenus.createTab(`beaker://library/?view=new-website&template=${encodeURIComponent(template || '')}`)
    bg.shellMenus.close()
  }
}
CreateMenu.styles = [commonCSS, css`
.header {
  text-align: left;
}

.header h2 {
  padding: 0 14px;
}

.wrapper {
  padding: 4px 0;
}
`]

customElements.define('create-menu', CreateMenu)
