import { LitElement, html } from '../../../vendor/lit-element/lit-element.js'
import { classMap } from '../../../vendor/lit-element/lit-html/directives/class-map.js'
import pickerCSS from '../../../css/com/reactions/picker.css.js'
import * as EMOJIS from '../../../data/emoji-list.js'
import { render as renderEmoji, setSkinTone } from '../../emoji.js'
import { findParent } from '../../dom.js'

const SKIN_TONE_EMOJIS = [`🏻`, `🏼`, `🏽`, `🏾`, `🏿`]

export class ReactionPicker extends LitElement {
  static get properties () {
    return {
      skinTone: {type: Number}
    }
  }

  constructor () {
    super()

    this.skinTone = +localStorage.lastSkinTone || 0

    const onGlobalKeyUp = e => {
      // listen for the escape key
      if (e.keyCode === 27) {
        this.onReject()
      }
    }
    const onGlobalClick = e => {
      // listen for clicks outside the picker
      if (findParent(e.target, e => e.tagName === 'BEAKER-REACTION-PICKER')) {
        return
      }
      this.onReject()
    }
    document.addEventListener('keyup', onGlobalKeyUp)
    document.addEventListener('click', onGlobalClick)

    // cleanup function called on cancel
    this.cleanup = () => {
      document.removeEventListener('keyup', onGlobalKeyUp)
      document.removeEventListener('click', onGlobalClick)
    }
  }

  // management
  //

  static async create ({left, top}) {
    var el = new ReactionPicker()
    document.body.appendChild(el)

    el.style.left = `${left}px`
    el.style.top = `${top}px`

    const cleanup = () => {
      el.cleanup()
      el.remove()
    }

    // return a promise that resolves with resolve/reject events
    return new Promise((resolve, reject) => {
      el.addEventListener('resolve', e => {
        resolve(e.detail)
        cleanup()
      })

      el.addEventListener('reject', e => {
        reject()
        cleanup()
      })
    })
  }

  static destroy (tagName) {
    var popup = document.querySelector(tagName)
    if (popup) popup.onReject()
  }

  // rendering
  // =

  render () {
    return html`
      <div class="header">
        <div class="title">
          Reactions
        </div>
        <div class="skin-tones">
          ${this.renderSkinToneOption(0)}
          ${this.renderSkinToneOption(1)}
          ${this.renderSkinToneOption(2)}
          ${this.renderSkinToneOption(3)}
          ${this.renderSkinToneOption(4)}
          ${this.renderSkinToneOption(5)}
        </div>
      </div>
      <div class="inner">
        <div class="heading">Frequently used</div>
        <div class="list">${EMOJIS.SUGGESTED.map(this.renderEmoji.bind(this))}</div>
        ${EMOJIS.GROUPS.map(group => html`
          <div class="heading">${group.name}</div>
          <div class="list">${group.emojis.map(this.renderEmoji.bind(this))}</div>
        `)}
      </div>
    `
  }

  renderSkinToneOption (n) {
    return html`
      <span class="${classMap({current: n === this.skinTone, ['option-'+n]: true})}" @click=${e => this.onSelectSkinTone(e, n)}>
        ${n === 0 ? html`<span class="none"></span>` : SKIN_TONE_EMOJIS[n - 1]}
      </span>
    `
  }

  renderEmoji (emoji) {
    return html`<span @click=${e => this.onClickEmoji(e, emoji)}>${renderEmoji(emoji, this.skinTone)}</span>`
  }

  // events
  // =

  onReject (e) {
    if (e) e.preventDefault()
    this.dispatchEvent(new CustomEvent('reject'))
  }

  onClickEmoji (e, emoji) {
    emoji = setSkinTone(emoji, this.skinTone)
    this.dispatchEvent(new CustomEvent('resolve', {detail: emoji}))
  }

  onSelectSkinTone (e, n) {
    e.preventDefault()
    e.stopPropagation()
    this.skinTone = n
    localStorage.lastSkinTone = n
  }
}
ReactionPicker.styles = pickerCSS

customElements.define('beaker-reaction-picker', ReactionPicker)
