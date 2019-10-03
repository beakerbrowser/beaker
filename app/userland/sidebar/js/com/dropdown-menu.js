import { html } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import * as contextMenu from '../../../app-stdlib/js/com/context-menu.js'

export function create ({x, y, render}) {
  return contextMenu.create({
    x,
    y,
    noBorders: true,
    fontAwesomeCSSUrl: 'beaker://assets/font-awesome.css',
    render () {
      return html`
        <style>
          .dropdown-items {
            padding: 0;
            min-width: 200px;
            font-size: 14px;
          }
          .dropdown-menu .dropdown-item {
            display: flex;
            align-items: center;

            /* remove link styles */
            color: #000;
            text-decoration: none;
          }
          .dropdown-menu .dropdown-item img {
            width: 32px;
            height: 32px;
            top: 0;
          }
        </style>
        <div class="dropdown-items with-triangle no-border left">
          ${render()}
        </div>
      `
    }
  })
}