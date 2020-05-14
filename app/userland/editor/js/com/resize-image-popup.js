import { html, css } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import { BasePopup } from '../../../app-stdlib/js/com/popups/base.js'
import popupsCSS from '../../../app-stdlib/css/com/popups.css.js'

// exported api
// =

export class ResizeImagePopup extends BasePopup {
  constructor (thumbUrl) {
    super()
    this.thumbUrl = thumbUrl
    this.width = 256
    this.height = 256
    this.maintainAspectRatio = true
    this.loadImg(thumbUrl)
  }

  get shouldCloseOnOuterClick () {
    return false
  }

  // management
  //

  static async create (thumbUrl) {
    return BasePopup.create(ResizeImagePopup, thumbUrl)
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
          <div class="canvas-container">
            <canvas id="the-canvas"></canvas>
          </div>
          <table>
            <tr>
              <td><label for="width">Width</label></td>
              <td><input type="text" id="width" name="width" value=${this.width} @keyup=${this.onChangeWidth}>px</td>
            </tr>
            <tr>
              <td><label for="height">Height</label></td>
              <td><input type="text" id="height" name="height" value=${this.height} @keyup=${this.onChangeHeight}>px</td>
            </tr>
            <tr>
              <td></td>
              <td>
                <input type="checkbox" id="should-maintain" name="should-maintain" ?checked=${this.maintainAspectRatio} @change=${this.onChangeCrop}>
                <label for="should-maintain">Maintain Aspect Ratio</label>
              </td>
            </tr>
          </table>
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
    this.img = document.createElement('img')
    this.img.src = url
    this.img.onload = () => {
      this.width = this.img.width
      this.height = this.img.height
      this.shadowRoot.querySelector('input[name="width"]').value = this.width
      this.shadowRoot.querySelector('input[name="height"]').value = this.height
      this.updateCanvas()
    }
  }

  updateCanvas () {
    var canvas = this.shadowRoot.getElementById('the-canvas')
    if (canvas) {
      canvas.setAttribute('width', this.width)
      canvas.setAttribute('height', this.height)

      var ctx = canvas.getContext('2d')
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, this.width, this.height)
      ctx.save()
      ctx.drawImage(this.img, 0, 0, this.width, this.height)
      ctx.restore()
    }
  }

  // events
  // =

  async onChangeWidth (e) {
    this.width = Number(e.currentTarget.value)
    if (this.maintainAspectRatio) {
      this.height = this.width * this.img.height / this.img.width
      this.shadowRoot.querySelector('input[name="height"]').value = this.height
    }
    await this.requestUpdate()
    this.updateCanvas()
  }

  async onChangeHeight (e) {
    this.height = Number(e.currentTarget.value)
    if (this.maintainAspectRatio) {
      this.width = this.height * this.img.width / this.img.height
      this.shadowRoot.querySelector('input[name="width"]').value = this.width
    }
    await this.requestUpdate()
    this.updateCanvas()
  }

  async onChangeCrop (e) {
    this.maintainAspectRatio = !!e.currentTarget.checked
    this.height = this.width * this.img.height / this.img.width
    this.shadowRoot.querySelector('input[name="height"]').value = this.height
    await this.requestUpdate()
    this.updateCanvas()
  }

  onSubmit (e) {
    e.preventDefault()
    e.stopPropagation()

    var canvas = this.shadowRoot.getElementById('the-canvas')
    var dataUrl = canvas.toDataURL(this.thumbUrl.endsWith('.png') ? 'image/png' : 'image/jpeg')

    this.dispatchEvent(new CustomEvent('resolve', {detail: dataUrl}))
  }
}
ResizeImagePopup.styles = [popupsCSS, css`
.canvas-container {
  display: flex;
  align-items: center;
  width: 334px;
  height: 300px;
  padding: 10px;
  overflow: auto;
  background: #fafafa;
}

canvas {
  display: block;
  margin: 0 auto;
}

.controls {
  color: #333;
}

table tr > td:first-child {
  text-align: right;
  padding-right: 4px;
}

table label {
  display: inline !important;
  width: auto !important;
}

table input[type="text"] {
  display: inline;
  width: 50px;
  margin: 0 5px 5px 0;
  height: 23px;
  text-align: right;
}

table input[type="checkbox"] {
  display: inline;
  width: auto;
  height: auto;
  margin: 0 5px 2px 0;
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

customElements.define('beaker-resize-image', ResizeImagePopup)