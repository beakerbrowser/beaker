/* globals beaker */
import { html, css } from '../../../vendor/lit-element/lit-element.js'
import { BasePopup } from './base.js'
import popupsCSS from '../../../css/com/popups.css.js'
import { emit } from '../../lib/dom.js'
import * as toast from '../toast.js'

// exported api
// =

export class GroupSettingsPopup extends BasePopup {
  static get properties () {
    return {
      thumbDataURL: {type: String},
      thumbExt: {type: String},
      bannerDataURL: {type: String},
      bannerExt: {type: String},
      title: {type: String},
      description: {type: String},
      sidebarMd: {type: String},
      pinnedMessageMd: {type: String},
      errors: {type: Object}
    }
  }

  static get styles () {
    return [popupsCSS, css`
    hr {
      border: 0;
      border-top: 1px solid #ccd;
      margin: 25px 0;
    }

    .img-ctrls {
      display: flex;
      align-items: center;
      margin-bottom: 10px;
    }

    .img-ctrl {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .img-ctrl beaker-img-fallbacks {
      height: 90px;
    }

    .img-ctrl.thumb img {
      border-radius: 50%;
      object-fit: cover;
      width: 80px;
      height: 80px;
      margin-bottom: 10px;
    }

    .img-ctrl.banner img {
      border-radius: 4px;
      object-fit: cover;
      width: 210px;
      height: 80px;
      margin-bottom: 10px;
    }

    input[type="file"] {
      display: none;
    }

    .toggle .text {
      font-size: 13px;
      margin-left: 8px;
    }

    .form-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      text-align: left;
    }
    `]
  }

  constructor () {
    super()
    this.load()
    this.errors = {}
  }

  async load () {
    var self = hyperdrive.self
    var info = await self.getInfo()
    var sidebarMd = await self.readFile('/beaker-forum/sidebar.md').catch(e => '')
    var pinnedMessageMd = await self.readFile('/beaker-forum/pinned-message.md').catch(e => '')
    
    this.thumbDataURL = undefined
    this.bannerDataURL = undefined
    this.title = info?.title
    this.description = info?.description
    this.sidebarMd = sidebarMd
    this.pinnedMessageMd = pinnedMessageMd
  }

  // management
  //

  static async create (parentEl) {
    return BasePopup.coreCreate(parentEl, GroupSettingsPopup)
  }

  static destroy () {
    return BasePopup.destroy('beaker-edit-profile-popup')
  }

  // rendering
  // =

  renderTitle () {
    return 'Group Settings'
  }

  renderBody () {
    return html`
      <link rel="stylesheet" href="/.ui/webfonts/fontawesome.css">
      <form @submit=${this.onSubmit}>
        <div class="img-ctrls">
          <div class="img-ctrl thumb">
            ${this.thumbDataURL === 'none' ? html`
              <img src="/.ui/img/default-group-thumb">
            ` : this.thumbDataURL ? html`
              <img src=${this.thumbDataURL}>
            ` : html`
              <beaker-img-fallbacks>
                <img src="/thumb" slot="img1">
                <img src="/.ui/img/default-group-thumb" slot="img2">
              </beaker-img-fallbacks>
            `}
            <input type="file" accept=".jpg,.jpeg,.png" @change=${this.onChooseThumbFile}>
            <div class="btn-group">
              <button type="button" @click=${this.onClickChangeThumb} class="btn" tabindex="4">Change Thumbnail</button>
              <button @click=${this.onClearThumb}><span class="fas fa-times"></span></button>
            </div>
          </div>

          <div class="img-ctrl banner">
            ${this.bannerDataURL === 'none' ? html`
              <img src="/.ui/img/default-group-banner"></img>
            ` : this.bannerDataURL ? html`
              <img src=${this.bannerDataURL}>
            ` : html`
              <beaker-img-fallbacks>
                <img src="/banner" slot="img1">
                <img src="/.ui/img/default-group-banner" slot="img2">
              </beaker-img-fallbacks>
            `}
            <input type="file" accept=".jpg,.jpeg,.png" @change=${this.onChooseBannerFile}>
            <div class="btn-group">
              <button type="button" @click=${this.onClickChangeBanner} class="btn" tabindex="4">Change Banner</button>
              <button @click=${this.onClearBanner}><span class="fas fa-times"></span></button>
            </div>
          </div>
        </div>

        <hr>

        <label for="title">Title</label>
        <input autofocus name="title" tabindex="2" value=${this.title || ''} placeholder="Group Title" @change=${this.onChangeTitle} class=${this.errors.title ? 'has-error' : ''} />
        ${this.errors.title ? html`<div class="error">${this.errors.title}</div>` : ''}

        <label for="description">Description</label>
        <input name="description" tabindex="3" placeholder="Group Description" @change=${this.onChangeDescription} class=${this.errors.description ? 'has-error' : ''} value=${this.description || ''}>
        ${this.errors.description ? html`<div class="error">${this.errors.description}</div>` : ''}

        <hr>

        <label for="sidebarMd">Sidebar Text</label>
        <textarea name="sidebarMd" tabindex="4" placeholder="Write your rules, instructions, etc here. (Markdown supported)" @change=${this.onChangeSidebarMd} class=${this.errors.sidebarMd ? 'has-error' : ''}>${this.sidebarMd || ''}</textarea>
        ${this.errors.sidebarMd ? html`<div class="error">${this.errors.sidebarMd}</div>` : ''}

        <hr>

        <label for="pinnedMessageMd">Pinned Message Text</label>
        <textarea name="pinnedMessageMd" tabindex="5" placeholder="Write an introduction message here. (Markdown supported)" @change=${this.onChangePinnedMessageMd} class=${this.errors.pinnedMessageMd ? 'has-error' : ''}>${this.pinnedMessageMd || ''}</textarea>
        ${this.errors.pinnedMessageMd ? html`<div class="error">${this.errors.pinnedMessageMd}</div>` : ''}

        <hr>

        <div class="form-actions">
          <button type="button" @click=${this.onClickCancel} class="btn cancel" tabindex="7">Cancel</button>
          <button type="submit" class="btn primary" tabindex="6">Save</button>
        </div>
      </form>
    `
  }

  // events
  // =

  onClickChangeThumb (e) {
    e.preventDefault()
    this.shadowRoot.querySelector('.thumb input[type="file"]').click()
  }

  onChooseThumbFile (e) {
    var file = e.currentTarget.files[0]
    if (!file) return
    var fr = new FileReader()
    fr.onload = () => {
      this.thumbExt = file.name.split('.').pop()
      this.thumbDataURL = /** @type string */(fr.result)
    }
    fr.readAsDataURL(file)
  }

  onClearThumb (e) {
    e.preventDefault()
    this.thumbDataURL = 'none'
  }

  onClickChangeBanner (e) {
    e.preventDefault()
    this.shadowRoot.querySelector('.banner input[type="file"]').click()
  }

  onChooseBannerFile (e) {
    var file = e.currentTarget.files[0]
    if (!file) return
    var fr = new FileReader()
    fr.onload = () => {
      this.bannerExt = file.name.split('.').pop()
      this.bannerDataURL = /** @type string */(fr.result)
    }
    fr.readAsDataURL(file)
  }

  onClearBanner (e) {
    e.preventDefault()
    this.bannerDataURL = 'none'
  }

  onChangeTitle (e) {
    this.title = e.target.value.trim()
  }

  onChangeDescription (e) {
    this.description = e.target.value.trim()
  }

  onChangeSidebarMd (e) {
    this.sidebarMd = e.target.value
  }

  onChangePinnedMessageMd (e) {
    this.pinnedMessageMd = e.target.value
  }

  onClickCancel (e) {
    e.preventDefault()
    emit(this, 'reject')
  }

  async onSubmit (e) {
    e.preventDefault()

    // validate
    this.errors = {}
    if (!this.title) this.errors.title = 'Required'
    if (Object.keys(this.errors).length > 0) {
      return this.requestUpdate()
    }

    try {
      let drive = hyperdrive.self
      await drive.configure({
        title: this.title,
        description: this.description
      })
      if (this.sidebarMd) {
        await drive.mkdir('/beaker-forum').catch(e => undefined)
        await drive.writeFile('/beaker-forum/sidebar.md', this.sidebarMd)
      } else {
        await drive.unlink('/beaker-forum/sidebar.md').catch(e => undefined)
      }
      if (this.pinnedMessageMd) {
        await drive.mkdir('/beaker-forum').catch(e => undefined)
        await drive.writeFile('/beaker-forum/pinned-message.md', this.pinnedMessageMd)
      } else {
        await drive.unlink('/beaker-forum/pinned-message.md').catch(e => undefined)
      }
      if (this.bannerDataURL) {
        await Promise.all([
          drive.unlink('/banner.jpg').catch(e => undefined),
          drive.unlink('/banner.jpeg').catch(e => undefined),
          drive.unlink('/banner.png').catch(e => undefined)
        ])
        if (this.bannerDataURL !== 'none') {
          var bannerBase64 = this.bannerDataURL ? this.bannerDataURL.split(',').pop() : undefined
          await drive.writeFile(`/banner.${this.bannerExt}`, bannerBase64, 'base64')
        }
      }
      if (this.thumbDataURL) {
        await Promise.all([
          drive.unlink('/thumb.jpg').catch(e => undefined),
          drive.unlink('/thumb.jpeg').catch(e => undefined),
          drive.unlink('/thumb.png').catch(e => undefined)
        ])
        if (this.thumbDataURL !== 'none') {
          var thumbBase64 = this.thumbDataURL ? this.thumbDataURL.split(',').pop() : undefined
          await drive.writeFile(`/thumb.${this.thumbExt}`, thumbBase64, 'base64')
        }
      }
      emit(this, 'resolve')
    } catch (e) {
      toast.create(e.toString(), 'error')
    }
  }
}

customElements.define('beaker-group-settings-popup', GroupSettingsPopup)
