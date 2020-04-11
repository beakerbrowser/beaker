import { html, css } from '../../../vendor/lit-element/lit-element.js'
import { BasePopup } from './base.js'
import popupsCSS from '../../../css/com/popups.css.js'

const CANVAS_WIDTH = 600
const CANVAS_HEIGHT = 200

// exported api
// =

export class BeakerEditCoverPhoto extends BasePopup {
  static get properties () {
    return {
      currentImgUrl: {type: String}
    }
  }

  constructor (siteUrl, existingCoverPath) {
    super()
    this.siteUrl = siteUrl
    this.loadedImg = null
    this.currentImgUrl = ''
    if (existingCoverPath) {
      this.currentImgUrl = `${siteUrl}${existingCoverPath}`
    }
  }

  // management
  //

  static async create (siteUrl, existingCoverPath) {
    return BasePopup.create(BeakerEditCoverPhoto, siteUrl, existingCoverPath)
  }

  static async runFlow (profiles) {
    var profile = await profiles.me()
    var drive = beaker.hyperdrive.drive(profile.url)

    // find the existing cover
    var existingCoverPath = null
    const test = async (path) => {
      if (existingCoverPath) return
      var res = await drive.stat(path).catch(e => undefined)
      if (res) existingCoverPath = path
    }
    await test('/cover.jpg')
    await test('/cover.jpeg')
    await test('/cover.png')

    // run the modal
    var img = await BeakerEditCoverPhoto.create(profile.url, existingCoverPath)
    if (!img) return

    // replace any existing cover
    await drive.unlink('/cover.jpg').catch(e => undefined)
    await drive.unlink('/cover.jpeg').catch(e => undefined)
    await drive.unlink('/cover.png').catch(e => undefined)
    await drive.writeFile(`/cover.${img.ext}`, img.base64buf, 'base64')
  }

  static destroy () {
    return BasePopup.destroy('beaker-edit-cover-photo')
  }

  // rendering
  // =

  renderTitle () {
    return `Update your cover photo`
  }

  renderBody () {
    return html`
      <form @submit=${this.onSubmit}>      
        <div class="controls">
          <img id="cover-img" @click=${this.onClickThumb} src="${this.currentImgUrl}">
          <div>
            <button class="btn" tabindex="1" @click=${this.onClickThumb}>Choose a file</button>
            <input type="file" accept=".jpg,.jpeg,.png" @change=${this.onChooseFile}>
          </div>
        </div>

        <div class="actions">
          <button type="button" class="btn" @click=${this.onReject} tabindex="3">Cancel</button>
          <button type="submit" class="btn primary" tabindex="2">Save</button>
        </div>
      </form>
    `
  }

  // events
  // =

  async onClickThumb (e) {
    e.preventDefault()
    this.shadowRoot.querySelector('input[type="file"]').click()
  }

  onChooseFile (e) {
    var file = e.currentTarget.files[0]
    if (!file) return
    var fr = new FileReader()
    fr.onload = () => {
      var ext = file.name.split('.').pop()
      this.currentImgUrl = fr.result
      var base64buf = fr.result.split(',').pop()
      this.loadedImg = {ext, base64buf}
    }
    fr.readAsDataURL(file)
  }

  onSubmit (e) {
    e.preventDefault()
    e.stopPropagation()
    this.dispatchEvent(new CustomEvent('resolve', {detail: this.loadedImg}))
  }
}
BeakerEditCoverPhoto.styles = [popupsCSS, css`
img {
  display: block;
  width: 600px;
  height: 200px;
  cursor: pointer;
  margin-bottom: 10px;
  object-fit: cover;
}

img:hover {
  opacity: 0.9;
}

.controls {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.popup-inner {
  width: 630px;
}

.popup-inner .actions {
  justify-content: space-between;
}

input[type="file"] {
  display: none;
}
`]

customElements.define('beaker-edit-cover-photo', BeakerEditCoverPhoto)