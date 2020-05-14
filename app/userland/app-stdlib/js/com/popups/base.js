import {LitElement, html} from '../../../vendor/lit-element/lit-element.js'
import popupsCSS from '../../../css/com/popups.css.js'

// exported api
// =

export class BasePopup extends LitElement {
  constructor () {
    super()

    const onGlobalKeyUp = e => {
      // listen for the escape key
      if (e.keyCode === 27) {
        this.onReject()
      }
    }
    document.addEventListener('keyup', onGlobalKeyUp)

    // cleanup function called on cancel
    this.cleanup = () => {
      document.removeEventListener('keyup', onGlobalKeyUp)
    }
  }

  get shouldCloseOnOuterClick () {
    return true
  }

  // management
  //

  static async coreCreate (parentEl, Class, ...args) {
    var popupEl = new Class(...args)
    parentEl.appendChild(popupEl)

    const cleanup = () => {
      popupEl.cleanup()
      popupEl.remove()
    }

    // return a promise that resolves with resolve/reject events
    return new Promise((resolve, reject) => {
      popupEl.addEventListener('resolve', e => {
        resolve(e.detail)
        cleanup()
      })

      popupEl.addEventListener('reject', e => {
        reject()
        cleanup()
      })
    })
  }

  static async create (Class, ...args) {
    return BasePopup.coreCreate(document.body, Class, ...args)
  }

  static destroy (tagName) {
    var popup = document.querySelector(tagName)
    if (popup) popup.onReject()
  }

  // rendering
  // =

  render () {
    return html`
      <div class="popup-wrapper" @click=${this.onClickWrapper}>
        <div class="popup-inner">
          <div class="head">
            <span class="title">${this.renderTitle()}</span>
            <span title="Cancel" @click=${this.onReject} class="close-btn square">&times;</span>
          </div>
          <div class="body">
            ${this.renderBody()}
          </div>
        </div>
      </div>
    `
  }

  renderTitle () {
    // should be overridden by subclasses
  }

  renderBody () {
    // should be overridden by subclasses
  }

  // events
  // =

  onClickWrapper (e) {
    if (e.target.classList.contains('popup-wrapper') && this.shouldCloseOnOuterClick) {
      this.onReject()
    }
  }

  onReject (e) {
    if (e) e.preventDefault()
    this.dispatchEvent(new CustomEvent('reject'))
  }
}

BasePopup.styles = [popupsCSS]