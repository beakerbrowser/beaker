import './intro.js'
import './profile.js'
import './grid-explainer.js'
import './fs-explainer.js'

customElements.define('setup-app', class extends HTMLElement {
  constructor () {
    super()
    this.stage = 1
    this.render()
    this.addEventListener('next', this.onNext.bind(this))
  }

  render () {
    switch (this.stage) {
      case 1:
        this.innerHTML = `<intro-view></intro-view>`
        break
      case 2:
        this.innerHTML = `<profile-view></profile-view>`
        break
      case 3:
        this.innerHTML = `<grid-explainer-view></grid-explainer-view>`
        break
      case 4:
        this.innerHTML = `<fs-explainer-view></fs-explainer-view>`
        break
      case 5:
        this.querySelector('fs-explainer-view').setPhase(2)
        break
      case 6:
        this.querySelector('fs-explainer-view').setPhase(3)
        break
      case 7:
        this.querySelector('fs-explainer-view').setPhase(4)
        break
    }
  }

  async onNext () {
    document.body.style.background = '#fff' // switch away from dark bg after first stage
    this.stage++
    if (this.stage < 8) {
      this.render()
    } else {
      await beaker.browser.updateSetupState({profileCreated: 1})
    }
  }
})