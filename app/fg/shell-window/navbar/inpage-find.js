/* globals customElements */
import {LitElement, html, css} from '../../vendor/lit-element/lit-element'
import * as bg from '../bg-process-rpc'
import buttonResetCSS from './button-reset.css'

class NavbarInpageFind extends LitElement {
  static get properties () {
    return {
      activeTabIndex: {type: Number},
      isActive: {type: Boolean, attribute: 'is-active'},
      query: {type: String},
      activeMatch: {type: Number, attribute: 'active-match'},
      numMatches: {type: Number, attribute: 'num-matches'}
    }
  }

  constructor () {
    super()
    this.activeTabIndex = undefined
    this.isActive = false
    this.query = ''
    this.activeMatch = 0
    this.numMatches = 0
  }

  // rendering
  // =

  render () {
    if (!this.isActive) {
      return html`<div></div>`
    }
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="input-container">
        <input type="text" placeholder="Find in page" @keyup=${this.onKeyup} autofocus>
        <button @click=${this.onClickPrev}><i class="fas fa-angle-up"></i></button>
        <button @click=${this.onClickNext}><i class="fas fa-angle-down"></i></button>
        <button @click=${this.onClickStop}><i class="fas fa-times"></i></button>
        <div class="stats">${this.activeMatch} / ${this.numMatches}</div>
      </div>
    `
  }

  updated (changedProperties) {
    if (changedProperties.get('isActive') === false) {
      // focus the input on initial render
      this.shadowRoot.querySelector('input').focus()
    }
  }

  // events
  // =

  onKeyup (e) {
    if (e.key === 'Escape') {
      bg.views.hideInpageFind(this.activeTabIndex)
      return
    }
    if (e.key === 'Enter') {
      let dir = e.shiftKey ? -1 : 1 // search backwords on shift+enter
      this.query = e.currentTarget.value
      if (this.query) {
        bg.views.setInpageFindString(this.activeTabIndex, this.query, dir)
      }
      return
    }
    if (this.query !== e.currentTarget.value) {
      this.query = e.currentTarget.value
      if (this.query) {
        bg.views.setInpageFindString(this.activeTabIndex, this.query, 1)
      }
    }
  }

  onClickNext (e) {
    bg.views.moveInpageFind(this.activeTabIndex, 1)
  }

  onClickPrev (e) {
    bg.views.moveInpageFind(this.activeTabIndex, -1)
  }

  onClickStop (e) {
    bg.views.hideInpageFind(this.activeTabIndex)
  }
}
NavbarInpageFind.styles = [buttonResetCSS, css`
:host {
}

.input-container {
  display: flex;
  position: relative;
  width: 350px;
  margin-left: 10px;
}

input {
  flex: 1;
  background: var(--bg-color--input);
  border: 1px solid var(--border-color--input);
  border-top-left-radius: 4px;
  border-bottom-left-radius: 4px;
  padding: 0 8px;

  line-height: 26px;
  width: 100%;
  height: 26px;

  color: var(--text-color--input);
  font-size: 13.5px;
  font-family: -apple-system, BlinkMacSystemFont, system-ui, "Segoe UI", Ubuntu, Cantarell, "Oxygen Sans", "Helvetica Neue", sans-serif;
  font-weight: 500;
  letter-spacing: -.2px;
}

input:focus {
  outline: 0;
  border-color: var(--border-color--input--focused);
}

button {
  border: 1px solid var(--border-color--input);
  border-left-width: 0;
  border-radius: 0;
  width: 30px;
  color: gray;
}

button:last-child {
  border-top-right-radius: 4px;
  border-bottom-right-radius: 4px;
}

.stats {
  position: absolute;
  right: 91px;
  font-size: 13px;
  color: var(--text-color--input);
  opacity: 0.7;
  top: 1px;
  background: var(--bg-color--input);
  height: 26px;
  line-height: 26px;
  padding: 0 9px;
}
`]
customElements.define('shell-window-navbar-inpage-find', NavbarInpageFind)
