/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import _get from 'lodash.get'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'

class ProfileMenu extends LitElement {
  constructor () {
    super()
    this.reset()
  }

  reset () {
    this.profile = null
  }

  async init (params) {
    this.profile = await bg.beakerBrowser.getUserSession().catch(err => undefined)
    await this.requestUpdate()
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="menu-item user-info"  @click=${e => this.onOpenPage(e, `intent:unwalled.garden/view-profile?url=${encodeURIComponent(this.profile.url)}`)}>
        <div class="thumb"><img src="asset:thumb:${_get(this.profile, 'url')}"></div>
        <div class="details">
          <h2 class="title">${_get(this.profile, 'title') || 'Anonymous'}</h2>
        </div>
      </div>
      <div class="menu-item" @click=${e => this.onOpenPage(e, this.profile.url)}>
        <i class="far fa-id-card"></i> Your personal website
      </div>
    `
  }

  // events
  // =

  onOpenPage (e, url) {
    bg.shellMenus.createTab(url)
    bg.shellMenus.close()
  }
}
ProfileMenu.styles = [commonCSS, css`
.wrapper {
  padding: 4px 0;
}

.user-info {
  display: flex;
  align-items: center;
  height: auto;
  padding: 10px 0;
  border-bottom: 1px solid #d4d7dc;
  margin-bottom: 5px;
}

.thumb {
  flex: 0 0 48px;
  padding: 0 15px 0;
  text-align: center;
}

.thumb img {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
}

`]

customElements.define('profile-menu', ProfileMenu)
