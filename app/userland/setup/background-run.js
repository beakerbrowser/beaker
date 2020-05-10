import { BaseSlideView } from './base-slide-view.js'

customElements.define('background-run-view', class extends BaseSlideView {
  constructor () {
    super()
    var checkbox = this.shadowRoot.querySelector('input')
    checkbox.checked = true
    checkbox.addEventListener('change', e => {
      beaker.browser.setSetting('run_background', checkbox.checked ? 1 : 0)
    })
  }

  render () {
    return `
<style>
:host {
  opacity: 0;
  transition: opacity 1s;
}
:host([fadein]) {
  opacity: 1;
}
:host([fadeout]) {
  opacity: 0;
}
h1 strong {
  font-size: 32px;
}
p {
  font-size: 19px;
}
img {
  display: block;
  width: 40vw;
  margin: 70px auto;
}
label {
  -webkit-app-region: no-drag; */
  margin: 0 10px;
}
</style>
<h1><strong>Beaker uses a peer-to-peer network</strong>.</h1>
<p>To help keep your data online, Beaker can run in the background even if it's not active.</p>
<p><img src="beaker://assets/img/onboarding/setup-tray-icon.png"></p>
<hr>
<p>
  <label>
    <input type="checkbox">
    Let Beaker run in the background
  </label>
</p>
<hr>
<a>Next</a>
    `
  }
})