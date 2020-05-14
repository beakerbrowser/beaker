import { BaseSlideView } from './base-slide-view.js'

customElements.define('grid-explainer-view', class extends BaseSlideView {
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
</style>
<h1>You are now on<br><strong>The Global Data Grid</strong></h1>
<hr>
<p class="big" style="font-size: 24px; margin: 125px 0">
  <strong>The Grid</strong> is a global filesystem that connects every computer in the world.
</p>
<hr>
<a>Next</a>
    `
  }
})