import { BaseSlideView } from './base-slide-view.js'

customElements.define('profile-explainer-view', class extends BaseSlideView {

  render () {
    return `
<style>
:host {
  opacity: 0;
  transition: opacity 1s;
  text-align: center;
}
:host([fadein]) {
  opacity: 1;
}
:host([fadeout]) {
  opacity: 0;
}
h1 {
  text-align: center;
  margin-top: 160px;
}
h1 strong {
  font-size: 32px;
}
p {
  font-size: 19px;
}
h1 + p {
  margin-bottom: 120px;
}
small {
  color: #889;
}
</style>
<h1><strong>Let's create your personal website</strong>.</h1>
<p>This site will be your profile on the p2p Web.</p>
<hr>
<p><small><span class="fas fa-fw fa-info"></span> You're free to use it or not! Your profile is not shared until you share it.</small></p>
<hr>
<a>Next</a>
    `
  }
})