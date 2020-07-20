import { html } from '../../vendor/lit-element/lit-element.js'
import * as contextMenu from './context-menu.js'
import * as toast from './toast.js'
import { writeToClipboard } from '../lib/clipboard.js'

export function create ({x, y, targetLabel, url}) {
  function onClickCopy (e) {
    writeToClipboard(url)
    toast.create('Copied to your clipboard')
  }
  contextMenu.create({
    x,
    y,
    render () {
      return html`
        <link rel="stylesheet" href="/css/font-awesome.css">
        <div class="share-menu">
          <p>Anybody with this link can view the ${targetLabel}</p>
          <p>
            <input type="text" value=${url}>
            <a @click=${onClickCopy}><span class="fas fa-paste"></span></a>
          </p>
        </div>
        <style>
          .share-menu {
            background: #fff;
            border-radius: 8px;
            box-sizing: border-box;
            padding: 12px;
            box-shadow: 0 2px 15px rgba(0, 0, 0, 0.3);
          }
          .share-menu p {
            position: relative;
          }
          .share-menu > :first-child {
            margin-top: 0;
          }
          .share-menu > :last-child {
            margin-bottom: 0;
          }
          input {
            width: 100%;
            border: 0;
            border-radius: 8px;
            padding: 4px 4px 4px 22px;
            box-sizing: border-box;
            background: #f5f5fa;
            outline: 0;
          }
          a {
            position: absolute;
            top: 0;
            left: 0;
            border-radius: 50%;
            box-sizing: border-box;
            padding: 4px 5px;
            background: #f5f5fa;
          }
          a:hover {
            cursor: pointer;
            background: #dde;
          }
        </style>
      `
    }
  })
}