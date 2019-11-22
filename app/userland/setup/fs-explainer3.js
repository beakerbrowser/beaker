import { BaseSlideView } from './base-slide-view.js'

customElements.define('fs-explainer3-view', class extends BaseSlideView {
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
<p style="font-size: 18px; margin: 30px 0 30px">
  <span class="far fa-hand-point-right"></span> You also have a public <strong><span class="fas fa-user-circle"></span> Profile</strong>.
</p>
<div class="fadein">
  <p style="font-size: 18px; margin: 30px 0 30px">
    <span class="far fa-hand-point-right"></span> Your <strong><span class="fas fa-home"></span> Home Drive</strong> is located at <code>~/</code><br>
    <span class="far fa-hand-point-right"></span> and your <strong><span class="fas fa-user-circle"></span> Profile</strong> is located at <code>~/profile</code>.
  </p>
  <div class="fadeout">
    <p class="sidenote">
      Anything you put in <code>~/profile</code> is public!
    </p>
  </div>
</div>
<a>Next</a>
    `
  }
})
