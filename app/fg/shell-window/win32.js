/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import * as bg from './bg-process-rpc'

class ShellWindowWin32 extends LitElement {
  // rendering
  // =

  render () {
    return html`
      <div>
        <a class="minimize" @click=${this.onClickMinimize}></a>
        <a class="maximize" @click=${this.onClickMaximize}></a>
        <a class="close" @click=${this.onClickClose}></a>
      </div>
    `
  }

  // events
  // =

  onClickMinimize () {
    bg.beakerBrowser.minimizeWindow()
  }

  onClickMaximize () {
    bg.beakerBrowser.toggleWindowMaximized()
  }

  onClickClose () {
    bg.beakerBrowser.closeWindow()
  }
}
ShellWindowWin32.styles = css`
div {
  display: flex;
  position: fixed;
  z-index: 10000;
  top: 0;
  right: 0;
  width: 150px;
  height: 33px;
  border-bottom: 1px solid var(--border-color--tab);
}

a {
  flex: 1;
  text-align: center;
  transition: background 0.25s, color 0.25s;
}

a:hover {
  background: rgba(0, 0, 0, 0.1);
}

.minimize:after {
  content: '';
  display: block;
  position: relative;
  border-top: 1px solid gray;
  width: 10px;
  height: 1px;
  left: 19px;
  top: 18px;
}

.maximize:after {
  content: '';
  display: block;
  position: relative;
  border: 1px solid gray;
  width: 8px;
  height: 8px;
  left: 20px;
  top: 12px;
}

.close:hover {
  background: #E81123;
  color: #fff;
}

.close:after {
  content: '\\00d7';
  font-size: 29px;
  font-weight: 100;
  font-family: -webkit-body;
  line-height: 34px;
}

@media (prefers-color-scheme: dark) {
  a:hover {
    background: rgba(0, 0, 0, 0.2);
  }
  .close {
    color: gray;
  }
  .close:hover {
    color: #fff;
  }
}
`
customElements.define('shell-window-win32', ShellWindowWin32)
