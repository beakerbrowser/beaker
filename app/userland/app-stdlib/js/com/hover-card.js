import {LitElement, html, css} from '../../vendor/lit-element/lit-element.js'

/*
Usage:

<beaker-hover-card>
  <span slot="el" class="fas fa-info-circle"></span>
  <div slot="card"><strong>Discovery Key:</strong> ${toHex(core.discoveryKey)}</div></div>
</beaker-hover-card>
*/

export class Hoverable extends LitElement {
  static get properties () {
    return {
      isHovered: {type: Boolean}
    }
  }

  static get styles () {
    return css`
    :host {
      position: relative;
    }

    .hovercard {
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 1px solid var(--border-color--default);
      background: var(--bg-color--default);
      border-radius: 4px;
      padding: 8px 10px;
    }
    `
  }

  constructor () {
    super()
    this.isHovered = false
    this.addEventListener('mouseenter', this.onMouseenter.bind(this))
    this.addEventListener('mouseleave', this.onMouseleave.bind(this))
  }

  render () {
    if (this.isHovered) {
      return html`
        <slot name="el"></slot>
        <div class="hovercard">
          <slot name="card"></slot>
        </div>
      `
    }
    return html`<slot name="el"></slot>`
  }

  onMouseenter () {
    this.isHovered = true
  }

  onMouseleave () {
    this.isHovered = false
  }
}

customElements.define('beaker-hover-card', Hoverable)