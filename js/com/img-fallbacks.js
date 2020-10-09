import {LitElement, html} from '../../vendor/lit-element/lit-element.js'

/*
Usage:

<beaker-img-fallbacks>
  <img src="/foo.png" slot="img1">
  <img src="/bar.png" slot="img2">
  <img src="/baz.png" slot="img3">
</beaker-img-fallbacks>
*/

export class ImgFallbacks extends LitElement {
  static get properties () {
    return {
      currentImage: {type: Number}
    }
  }

  constructor () {
    super()
    this.currentImage = 1
  }

  render () {
    return html`<slot name="img${this.currentImage}" @slotchange=${this.onSlotChange}></slot>`
  }

  onSlotChange (e) {
    var img = this.shadowRoot.querySelector('slot').assignedElements()[0]
    if (img) img.addEventListener('error', this.onError.bind(this))
  }

  onError (e) {
    this.currentImage = this.currentImage + 1
  }
}

customElements.define('beaker-img-fallbacks', ImgFallbacks)
