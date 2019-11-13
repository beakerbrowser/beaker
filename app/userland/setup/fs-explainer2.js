import { BaseSlideView } from './base-slide-view.js'

customElements.define('fs-explainer2-view', class extends BaseSlideView {
  render () {
    return `
<style>
:host .fadein {
  opacity: 0;
  transition: opacity 1s;
}
:host([fadein]) .fadein {
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
<div class="fadein">
  <p style="font-size: 18px; margin: 30px 0 30px">
    <span class="far fa-hand-point-right"></span> You also have a public <strong><span class="fas fa-user-circle"></span> Profile</strong>.
  </p>
  <div class="fadeout">
    <p class="sidenote">
      It contains your public content, including your<br><strong><span class="fas fa-university"></span> Public Library</strong> and <strong><span class="fas fa-rss"></span> Feed</strong>.
    </p>
  </div>
</div>
<a>Next</a>
    `
  }
})