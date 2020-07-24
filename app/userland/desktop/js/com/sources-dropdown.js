import { html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import * as contextMenu from 'beaker://app-stdlib/js/com/context-menu.js'

export function create ({x, y, items}) {
  console.log(items)
  return contextMenu.create({
    x,
    y,
    noBorders: true,
    render () {
      setTimeout(() => {
        this.shadowRoot.querySelector('input').focus()
      }, 50)
      const onChangeFilter = e => {
        var filter = e.currentTarget.value.toLowerCase().trim()
        Array.from(this.shadowRoot.querySelectorAll('.sub-items .dropdown-item'), el => {
          if (el.dataset.label.toLowerCase().includes(filter)) {
            el.classList.remove('hide')
          } else {
            el.classList.add('hide')
          }
        })
      }
      return html`
        <style>
          .sources-dropdown {
            width: 250px !important;
            font-size: 14px;
            border-radius: 22px !important;
          }
          .sources-dropdown input {
            border-radius: 16px;
            box-sizing: border-box;
            border: 1px solid var(--border-color--default);
            padding: 6px 12px;
            margin: 9px 10px 5px;
            width: calc(100% - 20px);
            outline: 0;
          }
          .sources-dropdown input:focus {
            border-color: var(--border-color--focused);
            box-shadow: 0 0 2px #7599ff77;
          }
          .sources-dropdown .sub-items {
            max-height: 50vh;
            overflow-y: scroll !important;
            background: var(--bg-color--light);
            border-top: 1px solid var(--border-color--default);
            margin-top: 7px;
            padding-top: 5px;
          }
          .sources-dropdown .dropdown-item.hide {
            display: none;
          }
        </style>
        <div class="sources-dropdown dropdown-items with-triangle no-border center">
          <input placeholder="Filter..." autofocus @keyup=${onChangeFilter}>
          <div class="sub-items">
            ${items.map(item => {
              if (item === '-') {
                return html`<hr />`
              }
              return html`
                <div class="dropdown-item" @click=${() => { contextMenu.destroy(); item.click() }} data-label=${item.label}>
                  ${item.label}
                </div>
              `
            })}
          </div>
        </div>
      `
    }
  })
}