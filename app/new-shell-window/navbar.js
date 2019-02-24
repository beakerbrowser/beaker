import {LitElement, html, css} from './lit-element/lit-element'

class ShellWindowNavbar extends LitElement {

  render () {
    return html`
      <div>navbar</div>
    `
  }
}
ShellWindowNavbar.styles = css`
:host {
  display: block;
  background: var(--bg-foreground);
  height: 30px;
}
`
customElements.define('shell-window-navbar', ShellWindowNavbar)
