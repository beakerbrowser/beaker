import './intro.js'
import './profile.js'

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
    }
  }

  async onNext () {
    this.stage++
    if (this.stage < 3) {
      this.render()
    } else {
      await beaker.browser.updateSetupState({profileCreated: 1})
    }
  }
})