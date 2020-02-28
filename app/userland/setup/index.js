import './intro.js'
import './migrating.js'
// import './grid-explainer.js'
// import './fs-explainer.js'

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
        this.innerHTML = `<migrating-view></migrating-view>`
        break
      // case 2:
      //   this.innerHTML = `<grid-explainer-view></grid-explainer-view>`
      //   break
      // case 3:
      //   this.innerHTML = `<fs-explainer-view></fs-explainer-view>`
      //   break
      // case 4:
      //   this.querySelector('fs-explainer-view').setPhase(2)
      //   break
      // case 5:
      //   this.querySelector('fs-explainer-view').setPhase(3)
      //   break
    }
  }

  async onNext () {
    document.body.style.background = '#fff' // switch away from dark bg after first stage
    this.stage++
    this.render()
    if (this.stage > 1) {
      await beaker.browser.migrate08to09()
      await beaker.browser.updateSetupState({migrated08to09: 1})
    }
  }
})