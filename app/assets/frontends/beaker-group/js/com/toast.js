import {LitElement, html} from '../../vendor/lit-element/lit-element.js'
import toastCSS from '../../css/com/toast.css.js'

// exported api
// =

export function create (message, type = '', time = 5000, button = null) {
  // destroy existing
  destroy()

  // render toast
  document.body.appendChild(new BeakerToast({message, type, button}))
  setTimeout(destroy, time)
}

// internal
// =

function destroy () {
  var toast = document.querySelector('beaker-toast')

  if (toast) {
    toast.remove()
  }
}

class BeakerToast extends LitElement {
  constructor ({message, type, button}) {
    super()
    this.message = message
    this.type = type
    this.button = button
  }

  render () {
    const onClick = e => destroy()
    const onButtonClick = this.button ? (e) => { destroy(); this.button.click(e) } : undefined
    return html`
    <div id="toast-wrapper" class="toast-wrapper ${this.button ? '' : 'nomouse'}" @click=${onClick}>
      <p class="toast ${this.type}">${this.message} ${this.button ? html`<a class="toast-btn" @click=${onButtonClick}>${this.button.label}</a>` : ''}</p>
    </div>
    `
  }
}
BeakerToast.styles = toastCSS

customElements.define('beaker-toast', BeakerToast)
