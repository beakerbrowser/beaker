import { html } from '../../vendor/lit-element/lit-element.js'
import * as contextMenu from './context-menu.js'
import * as loc from '../lib/location.js'

export function create (app, {x, y}) {
  function onChangeRenderMode (e, id) {
    app.onChangeRenderMode(e, id)
    this.requestUpdate()
  }

  function onToggleInlineMode (e) {
    app.onToggleInlineMode()
    this.requestUpdate()
  }

  function onChangeSortMode (e) {
    app.onChangeSortMode(e)
    this.requestUpdate()
  }
  
  const renderModes = app.renderModes
  const isViewfile = app.pathInfo.isFile() && loc.getPath().endsWith('.view')
  const isFolderLike = app.pathInfo.isDirectory() || isViewfile

  return contextMenu.create({
    x,
    y,
    render () {
      const sortModeOpt = (id, label) => html`
        <option ?selected=${id === app.sortMode} value=${id}>⇅ Sort by ${label}</option>
      `
      return html`
        <link rel="stylesheet" href="/css/font-awesome.css">
        <div class="settings-menu">
          ${renderModes.length ? html`
            <h5>View mode</h5>
            <div class="render-modes">
              ${renderModes.map(([id, icon, label]) => html`
                <div
                  class="btn transparent ${id == app.renderMode ? 'pressed' : ''}"
                  @click=${e => onChangeRenderMode.call(this, e, id)}
                  title="Change the view to: ${label}"
                >
                  <div><span class="fas fa-${icon}"></span></div>
                  <div>${label}</div>
                </div>
              `)}
            </div>
          ` : ''}
          ${isFolderLike ? html`
            <div class="btn ${app.inlineMode ? 'pressed' : ''}" @click=${onToggleInlineMode.bind(this)}>
              <span class="far fa-fw fa-${app.inlineMode ? 'check-square' : 'square'}"></span>
              Show the content of files
            </div>
            <div class="sort-modes">
              <select @change=${onChangeSortMode.bind(this)}>
                ${sortModeOpt('name', 'name')}
                ${sortModeOpt('name-reversed', 'name, reversed')}
                ${sortModeOpt('newest', 'newest')}
                ${sortModeOpt('oldest', 'oldest')}
                ${sortModeOpt('recently-changed', 'recently changed')}
              </select>
            </div>
          ` : ''}
        </div>
        <style>
          .settings-menu {
            background: #fff;
            border-radius: 2px;
            box-sizing: border-box;
            padding: 12px;
            box-shadow: 0 2px 15px rgba(0, 0, 0, 0.3);
            transform: translateX(-50%);
          }
          .settings-menu > * {
            margin-bottom: 5px;
          }
          .settings-menu > :first-child {
            margin-top: 0;
          }
          .settings-menu > :last-child {
            margin-bottom: 0;
          }
          .btn,
          select {
            display: block;
            -webkit-appearance: none;
            box-sizing: border-box;
            border-radius: 4px;
            cursor: pointer;
            padding: 6px 8px;
            border: 1px solid #ccd;
            color: #556;
            background: #fff;
            text-align: center;
            outline: 0;
          }
          .btn.pressed,
          .btn:hover,
          select:hover {
            background: #f5f5fd;
            border-color: #aab;
            color: #223;
          }
          span.btn {
            display: inline-block;
          }
          select {
            width: 100%;
            font-size: inherit;
            padding-top: 5px;
            padding-bottom: 4px;
            text-align-last: center;
          }
          .render-modes {
            display: flex;
          }
          .render-modes .btn {
            width: 100px;
            height: 80px;
            margin-right: 5px;
            text-align: center;
            line-height: 2.8;
            padding: 20px 0;
            font-size: 11px;
          }
          .render-modes .fas {
            font-size: 18px;
          }
          .render-modes > div:last-child {
            margin-right: 0;
          }
          .bottom-btn {
            margin: 8px -12px -12px !important;
            border: 0;
            border-top: 1px solid #ccd;
            border-radius: 0;
            border-bottom-left-radius: 8px;
            border-bottom-right-radius: 8px;
            padding: 10px;
            background: #f5f5fa;
            color: #889;
          }
          .bottom-btn:hover {
            color: #667;
            border-color: #ccd;
            background: #eeeef5;
          }
        </style>
      `
    }
  })
}