import { LitElement, html } from '../../../vendor/lit-element/lit-element.js'
import { classMap } from '../../../vendor/lit-element/lit-html/directives/class-map.js'
import { ifDefined } from '../../../vendor/lit-element/lit-html/directives/if-defined.js'

export class Reactions extends LitElement {
  static get properties () {
    return {
      reactions: {type: Object},
      userUrl: {type: String, attribute: 'user-url'},
      topic: {type: String}
    }
  }

  constructor () {
    super()
    this.reactions = []
    this.userUrl = ''
    this.topic = ''
  }

  createRenderRoot () {
    // dont use the shadow dom
    // this enables the post's hover state to hide/show the add button
    return this
  }

  render () {
    const renderReaction = r => {
      var alreadySet = !!r.authors.find(a => a.url === this.userUrl)
      var cls = classMap({reaction: true, pressed: alreadySet})
      return html`
        <span
          class="${cls}"
          @click=${e => this.emitChange(e, alreadySet, r.phrase)}
          data-tooltip=${ifDefined(r.authors.length ? r.authors.map(a => a.title || 'Anonymous').join(', ') : undefined)}
        >
          <span class="label">${r.phrase}</span>
          ${r.authors.length > 0 ? html`
            <span class="count">${r.authors.length}</span>
          `: ''}
        </span>
      `
    }

    return html`
      ${this.reactions.map(renderReaction)}
      <span class="reaction other" @click=${this.onClickOther} data-tooltip="Add a tag">
        <span class="fas fa-tag"></span>
      </span>
    `
  }

  // events
  // =

  emitChange (e, alreadySet, phrase) {
    e.preventDefault()
    e.stopPropagation()
    if (alreadySet) this.emitRemove(phrase)
    if (!alreadySet) this.emitAdd(phrase)
  }

  emitAdd (phrase) {
    this.dispatchEvent(new CustomEvent('add-reaction', {bubbles: true, composed: true, detail: {topic: this.topic, phrase}}))

    // optimistic update UI
    var author = {url: this.userUrl, title: 'You'}
    var reaction = this.reactions.find(r => r.phrase === phrase)
    if (reaction) reaction.authors.push(author)
    else this.reactions.push({phrase, authors: [author]})
    this.requestUpdate()
  }

  emitRemove (phrase) {
    this.dispatchEvent(new CustomEvent('delete-reaction', {bubbles: true, composed: true, detail: {topic: this.topic, phrase}}))

    // optimistic update UI
    var reaction = this.reactions.find(r => r.phrase === phrase)
    if (reaction) reaction.authors = reaction.authors.filter(author => author.url !== this.userUrl)
    this.requestUpdate()
  }

  async onClickOther (e) {
    e.preventDefault()
    e.stopPropagation()

    do {
      var phrase = prompt('Enter a tag')
      if (!phrase) break
      if (phrase.length > 20) {
        alert('Must be 20 characters or less')
        continue
      }
      if (/^[a-z ]+$/i.test(phrase) === false) {
        alert('Must only be characters (a-z)')
        continue
      }

      this.emitAdd(phrase.toLowerCase())
      break
    } while (true)
  }
}

customElements.define('beaker-reactions', Reactions)
