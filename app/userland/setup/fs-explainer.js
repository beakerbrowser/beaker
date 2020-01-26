import { BaseSlideView } from './base-slide-view.js'

const SIDENOTES = [
  'It contains all of your personal data, including your <strong><span class="far fa-star"></span>Bookmarks</strong> and <strong><span class="fas fa-cog"></span> Settings</strong>.',
  'It contains your public content, including your <strong><span class="fas fa-user-friends"></span> Follows</strong> and <strong><span class="fas fa-rss"></span> Posts</strong>.',
  'Anything you put in <code>~/</code> is private!',
  'Anything you put in <code>~/profile</code> is public!'
]

const SIDENOTE_TOPS = [
  '160px',
  '210px',
  '260px',
  '320px'
]

customElements.define('fs-explainer-view', class extends BaseSlideView {
  setPhase (n) {
    this.shadow.querySelector('.sidenote').innerHTML = SIDENOTES[n - 1]
    this.shadow.querySelector('.sidenote').style.top = SIDENOTE_TOPS[n - 1]
    Array.from(this.shadow.querySelectorAll('p.info')).slice(0, n).forEach(el => {
      el.classList.remove('grayed')
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

p.info {
  font-size: 18px;
  margin: 30px 0 30px;
  opacity: 1;
  transition: opacity 1s;
}
p.info.grayed {
  opacity: 0.2;
}
.sidenote {
  position: fixed;
  left: 74px;
  top: 160px;
  z-index: 1;
  transition: top 0.6s;

  color: #445;
  box-shadow: 0 2px 3px rgba(0,0,0,.1);
  background: #fff;
  border: 1px solid #ccd;
  padding: 20px;
  border-radius: 8px;
  font-size: 15px;
  line-height: 1.6;
  max-width: 70vw;
}
.sidenote strong {
  white-space: nowrap;
}
</style>
<h1>About your<br><strong>Personal Grid</strong></h1>
<hr>
<p class="info">
  <span class="bullet">&bull;</span> You have a private <strong><span class="fas fa-home"></span> Home Drive</strong>.
</p>
<p class="info grayed">
  <span class="bullet">&bull;</span> You also have a public <strong><span class="fas fa-user-circle"></span> Profile</strong>.
</p>
<p class="info grayed">
  <span class="bullet">&bull;</span> Your <strong><span class="fas fa-home"></span> Home Drive</strong> is located at <code>~/</code><br>
</p>
<p class="info grayed">
  <span class="bullet">&bull;</span> Your <strong><span class="fas fa-user-circle"></span> Profile</strong> is located at <code>~/profile</code>.
</p>
<p class="sidenote">
  ${SIDENOTES[0]}
</p>
<a>Next</a>
    `
  }
})