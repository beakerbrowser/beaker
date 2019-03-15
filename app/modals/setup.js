/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'
import inputsCSS from './inputs.css'
import buttonsCSS from './buttons.css'

const CANVAS_SIZE = 250

class SetupModal extends LitElement {
  static get properties () {
    return {
      stage: {type: Number},
      description: {type: String}
    }
  }

  constructor () {
    super()
    this.cbs = null
    this.stage = 1
    this.loadedImg = null
  }

  async init (params, cbs) {
    this.cbs = cbs
    this.stage = 1
    bg.modals.resizeSelf({width: 900, height: 700})
    await this.requestUpdate()
  }

  // rendering
  // =

  render () {
    switch (this.stage) {
      case 2:
        return this.renderStage2()
      case 3:
        return this.renderStage3()
      case 4:
        return this.renderStage4()
      case 5:
        return this.renderStage5()
      case 1:
      default:
        return this.renderStage1()
    }
  }

  renderStage1 () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <div class="intro">
          <img class="intro-logo" src="beaker://assets/logo">
          <h1 class="intro-title">Welcome to Beaker</h1>
          <p class="intro-text">
            The browser that <strong>does more</strong>.
          </p>
        </div>

        <div class="nav-controls">
          <button class="btn transparent thick" tabindex="1" @click=${this.onClickNext}>Next <span class="fas fa-chevron-circle-right"></span></button>
        </div>
      </div>
    `
  }

  renderStage2 () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <div class="intro">
          <h1 class="intro-title" style="margin: 10px 0 30px; font-size: 52px;">What can Beaker do?</h1>
          <div class="feature feat1">
            <span class="feature-icon fas fa-fw fa-magic"></span>
            <div class="feature-text">
              <h2>Create Websites</h2>
              <p>Make a new Website at the click of a button.</p>
            </div>
          </div>
          <div class="feature feat2">
            <span class="feature-icon fas fa-fw fa-rss"></span>
            <div class="feature-text">
              <h2>Follow users</h2>
              <p>Share status updates and follow each others' websites.</p>
            </div>
          </div>
          <div class="feature feat3">
            <span class="feature-icon fas fa-fw fa-search"></span>
            <div class="feature-text">
              <h2>Search privately</h2>
              <p>Search links shared by the users you follow.</p>
            </div>
          </div>
        </div>

        <div class="nav-controls">
          <button class="btn transparent thick" tabindex="1" @click=${this.onClickNext}>Next <span class="fas fa-chevron-circle-right"></span></button>
        </div>
      </div>
    `
  }

  renderStage3 () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <h1 class="title">Let's setup your profile</h1>
        <p class="help-text">
          How should your personal website describe you?
        </p>
        
        <form>
          <img class="thumb" src="beaker://assets/default-user-thumb">

          <label for="title-input">Your name</label>
          <input autofocus type="text" id="title-input" name="title" placeholder="Anonymous" />

          <label for="description-input">Your bio</label>
          <textarea id="description-input" name="description"></textarea>
        </form>

        <div class="nav-controls">
          <button class="btn transparent thick" tabindex="1" @click=${this.onClickNext}>Next <span class="fas fa-chevron-circle-right"></span></button>
        </div>
      </div>
    `
  }

  renderStage4 () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <h1 class="title">Let's choose a photo</h1>
        <p class="help-text">
          This will be the picture on your website
        </p>
        
        <div class="thumb-controls">
          <canvas id="thumb-canvas" width=${CANVAS_SIZE} height=${CANVAS_SIZE} @click=${this.onClickThumb}></canvas>
          <div>
            <button class="btn thick" tabindex="1" @click=${this.onClickThumb}>Choose a file</button>
            <input type="file" accept=".jpg,.jpeg,.png" @change=${this.onChooseThumbFile}>
          </div>
        </div>

        <div class="nav-controls">
          <button class="btn transparent thick" tabindex="1" @click=${this.onClickNext}>Next <span class="fas fa-chevron-circle-right"></span></button>
        </div>
      </div>
    `
  }

  renderStage5 () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <div class="intro">
          <h1 class="intro-title">You're all set.</h1>
          <p class="intro-text">Have fun!</p>
        </div>
        <div class="nav-controls">
          <button class="btn transparent thick" tabindex="1" @click=${this.onClickNext}>Get Started <span class="fas fa-chevron-circle-right"></span></button>
        </div>
      </div>
    `
  }

  updated () {
    var input = this.shadowRoot.querySelector('input')
    if (input) input.focus()
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

  async onClickNext (e) {
    if (this.stage === 3) await this.saveProfile()
    if (this.stage === 4) await this.saveThumb()
    this.stage++
    if (this.stage === 4) {
      this.loadImg('beaker://assets/default-user-thumb')
    }
    if (this.stage > 5) {
      return this.cbs.resolve()
    }
  }

  async saveProfile () {
    var form = this.shadowRoot.querySelector('form')
    var values = {
      title: form.title.value,
      description: form.description.value
    }
    var profile = await bg.profiles.getCurrentUser()
    await bg.datArchive.configure(profile.url, values)
  }

  async onClickThumb (e) {
    e.preventDefault()
    this.shadowRoot.querySelector('input[type="file"]').click()
  }

  onChooseThumbFile (e) {
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

  async saveThumb () {
    if (!this.loadedImg) return
    var profile = await bg.profiles.getCurrentUser()
    
    // replace any existing thumb
    await bg.datArchive.unlink(profile.url, '/thumb.jpg').catch(e => undefined)
    await bg.datArchive.unlink(profile.url, '/thumb.jpeg').catch(e => undefined)
    await bg.datArchive.unlink(profile.url, '/thumb.png').catch(e => undefined)
    await bg.datArchive.writeFile(profile.url, `/thumb.${this.loadedImg.ext}`, this.loadedImg.base64buf, 'base64')
  }
}
SetupModal.styles = [commonCSS, inputsCSS, buttonsCSS, css`
/* TODO
.wrapper {
  padding: 10px 20px;
  height: 100%;
  box-sizing: border-box;
}
*/

h1.title {
  font-size: 25px;
}

.help-text {
  font-style: normal;
  font-size: 16px;
}

.intro {
  text-align: center;
  position: fixed;
  left: 0;
  top: 50%;
  transform: translate(0%, -55%);
  width: 100%;
}

.intro-title,
.intro-text {
  font-size: 46px;
  font-weight: normal;
  margin: 0;
}

.intro-title {
  font-size: 64px;
  color: rgba(0,0,0,.8);
}

.intro-text {
  color: #354cca;
}

.intro-logo {
  margin: 0 0 60px;
}

.nav-controls {
  position: fixed;
  bottom: 20px;
  right: 20px;
}

form {
  padding: 50px 60px;
}

.thumb {
  display: block;
  border-radius: 50%;
  margin: 0px auto 20px;
  width: 200px;
}

form input {
  height: 48px;
  padding: 0 14px;
  font-size: 25px;
}

form textarea {
  padding: 10px 14px;
  height: 60px;
  font-size: 18px;
}

.feature {
  display: flex;
  align-items: center;
  text-align: left;
  padding: 6px 40px 10px;
  margin: 10px 50px;
  font-size: 15px;
}

.feature-icon {
  margin-right: 40px;
  font-size: 40px;
}

.feature p {
  font-size: 16px;
}

.feat1 .fas,
.feat1 h2 {
  color: #E91E63;
}

.feat2 .fas,
.feat2 h2 {
  color: #3F51B5;
}

.feat3 .fas,
.feat3 h2 {
  color: #2196F3;
}

.thumb-controls {
  text-align: center;
  margin: 100px 0;
}

canvas {
  margin-bottom: 30px;
  border-radius: 50%;
  cursor: pointer;
}

canvas:hover {
  opacity: 0.5;
}

input[type="file"] {
  display: none;
}

.nav-controls .btn {
  font-size: 16px;
  padding: 0 20px;
  height: 40px;
}
`]

customElements.define('setup-modal', SetupModal)