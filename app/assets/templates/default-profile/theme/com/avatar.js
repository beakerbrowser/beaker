import { LitElement, html } from '../vendor/lit-element.js'; 

class Avatar extends LitElement {
  static get properties () {
    return {
      src: String
    }
  }

  render() {
    return html`
      <style>
        img {
          max-width: 100%;
          border-radius: 50%;
          border: 5px solid #fff;
        }
      </style>
      <img src=${this.src}>
    `
  }
}

customElements.define('x-avatar', Avatar)
