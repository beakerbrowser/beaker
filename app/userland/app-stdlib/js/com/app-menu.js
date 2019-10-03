import {html} from '../../vendor/lit-element/lit-element.js'
import * as contextMenu from './context-menu.js'

export function create ({x, y}) {
  return contextMenu.create({
    x,
    y,
    noBorders: true,
    render () {
      return html`
        <style>
          .app-menu {
            padding: 4px 0;
            min-width: 200px;
            font-size: 14px;
          }
          .app-menu .dropdown-item {
            display: flex;
            align-items: center;

            /* remove link styles */
            color: #000;
            text-decoration: none;
          }
          .app-menu .dropdown-item img {
            width: 32px;
            height: 32px;
            top: 0;
          }
        </style>
        <div class="app-menu dropdown-items with-triangle no-border right">
          <div class="section-header small light">Applications</div>
          <a class="dropdown-item" href="beaker://library/">
            <img src="/vendor/beaker-app-stdlib/img/icons/library.png">
            Library
          </a>
          <a class="dropdown-item" href="dat://beaker.social/">
            <img src="/vendor/beaker-app-stdlib/img/icons/newsfeed.png">
            Beaker.Social
          </a>
        </div>
      `
    }
  })
}