import { LitElement, html, css } from '/vendor/lit-element/lit-element.js';

class MyApp extends LitElement {
  static get properties() {
    return {
      title: { type: String },
    };
  }

  constructor() {
    super();
    this.title = 'My LitElement App';
  }

  static get styles() {
    return [
      css`
        :host {
          text-align: center;
          font-size: calc(10px + 2vmin);
          color: #1a2b42;
        }
        a {
          color: #217ff9;
        }

        .app-footer {
          color: #a8a8a8;
          font-size: calc(10px + 0.5vmin);
          position: fixed;
          bottom: 0;
          left: 10px;
        }
      `,
    ];
  }

  render() {
    return html`
      <header class="app-header">
        <h1>${this.title}</h1>
        <a
          class="app-link"
          href="https://open-wc.org/developing/#examples"
          target="_blank"
          rel="noopener noreferrer"
        >
          Code examples
        </a>
      </header>
      <p class="app-footer">
        🚽 Made with love by
        <a target="_blank" rel="noopener noreferrer" href="https://github.com/open-wc">open-wc</a>.
      </p>
    `;
  }
}

customElements.define('my-app', MyApp);
