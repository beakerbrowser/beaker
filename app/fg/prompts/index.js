/* globals customElements */
import { LitElement, html } from '../vendor/lit-element/lit-element'
import './progress'

class PromptsWrapper extends LitElement {
  static get properties () {
    return {
      currentPrompt: {type: String}
    }
  }

  constructor () {
    super()
    this.currentParams = null

    // export interface
    const reset = (name) => {
      if (!name.endsWith('-prompt')) name += '-prompt'
      try { this.shadowRoot.querySelector(name).reset() }
      catch (e) { /* ignore */ }
    }
    const init = (name) => {
      try { return this.shadowRoot.querySelector(name).init(this.currentParams) }
      catch (e) { console.log(e) /* ignore */ }
    }
    window.showPrompt = async (v, params) => {
      this.currentPrompt = v
      this.currentParams = params
      reset(`${v}-prompt`)
      await this.updateComplete
      await init(`${v}-prompt`)
    }
    window.reset = reset
  }

  render () {
    return html`<div @contextmenu=${this.onContextMenu}>${this.renderPrompt()}</div>`
  }

  renderPrompt () {
    switch (this.currentPrompt) {
      case 'progress':
        return html`<progress-prompt></progress-prompt>`
    }
    return html`<div></div>`
  }

  onContextMenu (e) {
    e.preventDefault() // disable context menu
  }
}

customElements.define('prompts-wrapper', PromptsWrapper)