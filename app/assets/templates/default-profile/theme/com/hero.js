import { LitElement, html } from '../vendor/lit-element.js'; 

class Hero extends LitElement {
  static get properties () {
    return {
      displayName: String,
      bio: String
    }
  }

  render() {
    return html`
      <link rel="stylesheet" href="/theme/vendor/bulma.min.css">
      <h1 class="title is-4">${this.displayName}</h1>
      ${this.bio ? html`<h2 class="subtitle is-6">${this.bio}</h2>` : ''}
    `
  }
}

customElements.define('x-hero', Hero)
