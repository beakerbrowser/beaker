import { BaseSlideView } from './base-slide-view.js'

customElements.define('fs-explainer-view', class extends BaseSlideView {
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
:host .fadeout {
  opacity: 1;
  transition: opacity 1s;
}
:host([fadeout]) .fadeout {
  opacity: 0;
}
</style>
<h1>About your<br><strong>Personal Grid</strong></h1>
<hr>
<p style="font-size: 18px; margin: 30px 0 30px">
  <span class="far fa-hand-point-right"></span> You have a private <strong><span class="fas fa-home"></span> Home Drive</strong>.
</p>
<div class="fadeout">
  <p class="sidenote">
    It contains all of your personal data, including your<br><strong><span class="fas fa-university"></span>Private Library</strong> and <strong><span class="fas fa-cog"></span> Settings</strong>.
  </p>
</div>
<a>Next</a>
    `
  }
})