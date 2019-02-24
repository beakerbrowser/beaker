import { LitElement, html } from './lit-element/lit-element'
import './tabs'
import './navbar'

class ShellWindowUI extends LitElement {
  constructor () {
    super()

    var {platform} = beaker.browser.getInfo()
    window.platform = platform
    if (platform === 'darwin') {
      document.body.classList.add('darwin')
    }
    if (platform === 'win32') {
      document.body.classList.add('win32')
    }
  }

  render(){
    return html`
      <shell-window-tabs></shell-window-tabs>
      <shell-window-navbar></shell-window-navbar>
    `
  }
}
customElements.define('shell-window', ShellWindowUI);

