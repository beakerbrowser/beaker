import { html, css } from '../../../vendor/lit-element/lit-element.js'
import { BasePopup } from './base.js'
import popupsCSS from '../../../css/com/popups.css.js'

const CANVAS_SIZE = 125

// exported api
// =

export class BeakerEditThumb extends BasePopup {
  constructor (siteUrl, existingThumbPath) {
    super()
    this.siteUrl = siteUrl
    this.loadedImg = null
    if (existingThumbPath) {
      this.loadImg(`${siteUrl}${existingThumbPath}`)
    }
  }

  // management
  //

  static async create (siteUrl, existingThumbPath) {
    return BasePopup.create(BeakerEditThumb, siteUrl, existingThumbPath)
  }

  static async runFlow (profiles) {
    var profile = await profiles.me()
    var drive = beaker.hyperdrive.drive(profile.url)

    // find the existing thumb
    var existingThumbPath = null
    const test = async (path) => {
      if (existingThumbPath) return
      var res = await drive.stat(path).catch(e => undefined)
      if (res) existingThumbPath = path
    }
    await test('/thumb.jpg')
    await test('/thumb.jpeg')
    await test('/thumb.png')

    // run the modal
    var img = await BeakerEditThumb.create(profile.url, existingThumbPath)
    if (!img) return

    // replace any existing thumb
    await drive.unlink('/thumb.jpg').catch(e => undefined)
    await drive.unlink('/thumb.jpeg').catch(e => undefined)
    await drive.unlink('/thumb.png').catch(e => undefined)
    await drive.writeFile(`/thumb.${img.ext}`, img.base64buf, 'base64')
  }

  static destroy () {
    return BasePopup.destroy('beaker-edit-thumb')
  }

  // rendering
  // =

  renderTitle () {
    return `Update your profile photo`
  }

  renderBody () {
    return html`
      <form @submit=${this.onSubmit}>
        <div class="controls">
          <canvas id="thumb-canvas" width=${CANVAS_SIZE} height=${CANVAS_SIZE} @click=${this.onClickThumb}></canvas>
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

  // canvas handling
  // =

  loadImg (url) {
    this.zoom = 1
    this.img = document.createElement('img')
    this.img.src = url
    this.img.onload = () => {
      var smallest = (this.img.width < this.img.height) ? this.img.width : this.img.height
      this.zoom = CANVAS_SIZE / smallest
      this.updateCanvas()
    }
  }

  updateCanvas () {
    var canvas = this.shadowRoot.getElementById('thumb-canvas')
    if (canvas) {
      var ctx = canvas.getContext('2d')
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
      ctx.save()
      ctx.scale(this.zoom, this.zoom)
      ctx.drawImage(this.img, 0, 0, this.img.width, this.img.height)
      ctx.restore()
    }
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
      this.loadImg(fr.result)
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
BeakerEditThumb.styles = [popupsCSS, css`
canvas {
  display: block;
  margin: 0 30px 0 10px;
  width: 125px;
  height: 125px;
  border-radius: 50%;
  cursor: pointer;
}

canvas:hover {
  opacity: 0.5;
}

.controls {
  display: flex;
  margin: 20px 20px 30px;
  align-items: center;
}

.popup-inner {
  width: 360px;
}

.popup-inner .actions {
  justify-content: space-between;
}

input[type="file"] {
  display: none;
}
`]

customElements.define('beaker-edit-thumb', BeakerEditThumb)