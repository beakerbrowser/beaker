import { LitElement, html } from '../../../vendor/lit-element/lit-element.js'
import { classMap } from '../../../vendor/lit-element/lit-html/directives/class-map.js'
import { ifDefined } from '../../../vendor/lit-element/lit-html/directives/if-defined.js'
import { ucfirst } from '../../strings.js'

const DEFAULT_PHRASES = ['like', 'agree', 'haha']

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

  get defaultReactions () {
    var reactions = this.reactions || []
    return DEFAULT_PHRASES.map(phrase => reactions.find(r => r.phrase === phrase) || {phrase, authors: []})
  }

  get addedReactions () {
    return this.reactions.filter(r => !DEFAULT_PHRASES.includes(r.phrase))
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
          <span class="label">${ucfirst(r.phrase)}</span>
          ${r.authors.length > 0 ? html`
            <span class="count">${r.authors.length}</span>
          `: ''}
        </span>
      `
    }

    var reactions = this.reactions.slice()
    for (let i = 0; i < DEFAULT_PHRASES.length && reactions.length < 4; i++) {
      if (!reactions.find(r => r.phrase === DEFAULT_PHRASES[i])) {
        reactions.push({phrase: DEFAULT_PHRASES[i], authors: []})
      }
    }

    return html`
      ${reactions.map(renderReaction)}
      <span class="reaction other" @click=${this.onClickOther} data-tooltip="Custom reaction">
        <span class="fas fa-pencil-alt"></span>
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
      var phrase = prompt('Enter a custom reaction (characters only)')
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
