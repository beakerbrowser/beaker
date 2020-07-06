/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import _get from 'lodash.get'
import * as bg from './bg-process-rpc'

class ProgressPrompt extends LitElement {
  static get properties () {
    return {
      label: {type: String},
      progress: {type: Number}
    }
  }

  static get styles () {
    return [css`
      .wrapper {
        display: flex;
        align-items: center;
        overflow: hidden;
        padding: 10px 16px;
      }
      .wrapper span {
        margin-right: 10px;
      }
      .wrapper progress {
        flex: 1;
      }
    `]
  }

  constructor () {
    super()
    this.reset()
  }

  reset () {
    this.label = 'Working...'
    this.progress = 0
  }

  async init (params) {
    this.label = params.label
    window.updateProgress = p => this.progress = p
    await this.requestUpdate()
  }

  // rendering
  // =

  render () {
    let pct = (this.progress * 100)|0
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <span>${this.label}</span>
        <progress max="100" value=${pct}> ${pct}% </progress>
      </div>
    `
  }
}

customElements.define('progress-prompt', ProgressPrompt)
