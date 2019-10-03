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
          <button class="btn transparent thick" tabindex="1" @click=${this.onClickNext}>Get Started <span class="fas fa-chevron-circle-right"></span></button>
        </div>
      </div>
    `
  }

  // events
  // =

  async onClickNext (e) {
    this.stage++
    if (this.stage > 2) {
      return this.cbs.resolve()
    }
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

.nav-controls {
  position: fixed;
  bottom: 20px;
  right: 20px;
}

.nav-controls .btn {
  font-size: 16px;
  padding: 0 20px;
  height: 40px;
}
`]

customElements.define('setup-modal', SetupModal)