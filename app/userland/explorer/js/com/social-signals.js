import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { until } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/until.js'
import css from '../../css/com/social-signals.css.js'
import 'beaker://app-stdlib/js/com/reactions/reactions.js'

class SocialSignals extends LitElement {
  static get properties () {
    return {
      userUrl: {type: String, attribute: 'user-url'},
      authors: {type: Array},
      topic: {type: String}
    }
  }

  static get styles () {
    return css
  }

  constructor () {
    super()
    this.userUrl = undefined
    this.authors = undefined
    this.topic = undefined
    this.numComments = undefined
    this.reactions = undefined
  }

  // rendering
  // =

  render () {
    if (!this.userUrl || !this.authors || !this.topic) return html``
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <span class="comments">
        <span class="far fa-fw fa-comment"></span>
        ${until(this.renderNumComments(), '')}
      </span>
      ${until(this.renderReactions(), '')}
    `
  }
  
  async renderNumComments () {
    if (this.numComments === undefined) {
      this.numComments = (await uwg.comments.list({topic: this.topic, author: this.authors})).length
    }
    return this.numComments
  }

  async renderReactions () {
    if (this.reactions === undefined) {
      this.reactions = await uwg.reactions.tabulate(this.topic, {author: this.authors})
    }
    return html`
      <beaker-reactions
        user-url="${this.userUrl}"
        .reactions=${this.reactions}
        topic="${this.topic}"
      ></beaker-reactions>
    `
  }
}
customElements.define('social-signals', SocialSignals)