import { LitElement, html } from '../vendor/lit-element.js'

class FourOhFour extends LitElement {
  createRenderRoot() {
    return this // dont use the shadow dom
  }

  render() {
    return html`
      <style>
        .hero.is-fullheight {
          min-height: calc(100vh - 52px);
        }
      </style>
      <section class="hero is-info is-fullheight">
        <div class="hero-body">
          <div class="container">
            <h1 class="title">
              404 Not Found
            </h1>
            <h2 class="subtitle">
              <a href="/">Go to my homepage</a>
            </h2>
          </div>
        </div>
      </section>
    `
  }
}

customElements.define('x-404', FourOhFour)
