import {LitElement, html} from '../../vendor/lit-element/lit-element.js'

/*
Usage:

<beaker-hoverable>
  <button class="btn" slot="default">Hover me!</button>
  <button class="btn" slot="hover">I'm hovered!</button>
</beaker-hoverable>
*/

export class Hoverable extends LitElement {
  static get properties () {
    return {
      isHovered: {type: Boolean}
    }
  }

  constructor () {
    super()
    this.isHovered = false
  }

  render () {
    if (this.isHovered) {
      return html`<span @mouseleave=${this.onMouseleave}><slot name="hover"></slot></span>`
    }
    return html`<span @mouseenter=${this.onMouseenter}><slot name="default"></slot></span>`
  }

  onMouseenter () {
    this.isHovered = true

    // HACK
    // sometimes, if the mouse cursor leaves too quickly, 'mouseleave' doesn't get fired
    // after a few ms, double check that it's still hovered
    // -prf
    setTimeout(() => {
      if (!this.querySelector(':hover')) {
        this.isHovered = false
      }
    }, 50)
  }

  onMouseleave () {
    this.isHovered = false
  }
}

customElements.define('beaker-hoverable', Hoverable)