import { BaseSlideView } from './base-slide-view.js'

customElements.define('migrating-view', class extends BaseSlideView {
  constructor () {
    super()
    this.doMigration()
  }

  async doMigration () {
    await beaker.browser.migrate08to09()
    await beaker.browser.updateSetupState({migrated08to09: 1})
    this.dispatchEvent(new CustomEvent('next', {bubbles: true, composed: true}))
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

h1 {
  line-height: 100vh;
  margin: 0 10px;
  font-size: 26px;
  text-align: center;
}

.spinner {
  position: relative;
  top: 1px;

  display: inline-block;
  height: 18px;
  width: 18px;
  margin-right: 5px;
  animation: rotate 1s infinite linear;
  color: #000;
  border: 1.5px solid;
  border-right-color: transparent;
  border-radius: 50%;
  transition: color 0.25s;
}

.spinner.reverse {
  animation: rotate 2s infinite linear reverse;
}

@keyframes rotate {
  0%    { transform: rotate(0deg); }
  100%  { transform: rotate(360deg); }
}
</style>
<h1><span class="spinner"></span> Migrating your profile...</h1>
    `
  }
})