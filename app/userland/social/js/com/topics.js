import { LitElement, html } from '../../vendor/lit-element/lit-element.js'
import css from '../../css/com/topics.css.js'
import { toNiceTopic } from '../lib/strings.js'
import * as uwg from '../lib/uwg.js'

export class Topics extends LitElement {
  static get properties () {
    return {
      topics: {type: Array}
    }
  }

  static get styles () {
    return css
  }

  constructor () {
    super()
    this.topics = undefined
  }

  async load () {
    this.topics = await uwg.topics.list()
  }

  render () {
    return html`
      <h3>Topics</h3>
      <p><a href="/">All</a></p>
      ${this.topics ? this.topics.map(topic => html`
        <p><a href="/?topic=${encodeURIComponent(topic)}">${toNiceTopic(topic)}</a></p>
      `) : html`
        <div class="spinner"></div>
      `}
    `
  }

  // events
  // =
}

customElements.define('beaker-topics', Topics)
