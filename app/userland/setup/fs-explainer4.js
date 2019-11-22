import { BaseSlideView } from './base-slide-view.js'

customElements.define('fs-explainer4-view', class extends BaseSlideView {
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
<p style="font-size: 18px; margin: 30px 0 30px">
  <span class="far fa-hand-point-right"></span> Your <strong><span class="fas fa-home"></span> Home Drive</strong> is located at <code>~/</code><br>
  <span class="far fa-hand-point-right"></span> and your <strong><span class="fas fa-user-circle"></span> Profile</strong> is located at <code>~/profile</code>.
</p>
<div class="fadein">
  <p style="font-size: 18px; margin: 30px 0 30px">
    <span class="far fa-hand-point-right"></span> You can create additional hyperdrives to share separately.
  </p>
  <div class="fadeout">
    <p class="sidenote">
    New hyperdrives will be saved to your <strong><span class="fas fa-university"></span> Private Library</strong> at <code>~/library</code>.
    </p>
  </div>
</div>
<a>Next</a>
    `
  }
})

{/* <p style="font-size: 18px; margin: 30px 0 30px">
  When you create new hyperdrives, they will be mounted to your <strong><span class="fas fa-university"></span> Private Library</strong> at <code>~/library</code>.
</p>
<p style="font-size: 18px; margin: 30px 0 30px">
  If you want to share a hyperdrive, you can mount it to your <strong><span class="fas fa-university"></span> Public Library</strong> at <code>~/profile/library</code>.
</p> */}