import { html } from '../../vendor/lit-element/lit-element.js'
import * as contextMenu from './context-menu.js'
import { isSameOrigin } from '../strings.js'

export function create ({x, y, record, profileUrl, onAdd, onRemove}) {
  return contextMenu.create({
    x,
    y,
    noBorders: true,
    render () {
      setTimeout(() => {
        this.shadowRoot.querySelector('input').focus()
      }, 50)
      const onKeyupInput = async e => {
        var input = e.currentTarget
        var value = input.value.toLowerCase().trim()
        value = value.replace(/[^a-z0-9-]/g, '').slice(0, 25)
        input.value = value
        if (e.code === 'Enter') {
          input.value = ''
          let url = await onAdd(value)
          record.tags.push({
            url,
            metadata: {'tag/id': value},
            site: {url: profileUrl, title: 'You'}
          })
          this.requestUpdate()
        }
      }
      const onClickRemove = async (e, tag) => {
        record.tags = record.tags.filter(t => t !== tag)
        this.requestUpdate()
        await onRemove(tag)
        this.requestUpdate()
      }
      return html`
        <style>
          .tags-dropdown {
            width: 250px !important;
            font-size: 14px;
            border-radius: 22px !important;
          }
          .tags-dropdown input {
            border-radius: 16px;
            box-sizing: border-box;
            border: 1px solid var(--border-color--default);
            padding: 6px 12px;
            margin: 9px 10px 9px;
            width: calc(100% - 20px);
            outline: 0;
          }
          .tags-dropdown input:focus {
            border-color: var(--border-color--focused);
            box-shadow: 0 0 2px #7599ff77;
          }
          .tags-dropdown .tags {
            max-height: 25vh;
            overflow-y: scroll !important;
            background: var(--bg-color--light);
            border-top: 1px solid var(--border-color--default);
            padding: 8px 15px 10px;
            font-size: 12px;
            line-height: 20px;
          }
          .tags-dropdown .dropdown-item.hide {
            display: none;
          }
          .tags-dropdown .tags a {
            color: var(--text-color--link);
            text-decoration: none;
            cursor: pointer;
          }
          .tags-dropdown .tags a.remove {
            color: var(--text-color--light);
          }
        </style>
        <div class="tags-dropdown dropdown-items with-triangle no-border center">
          <input placeholder="Add a tag..." autofocus @keyup=${onKeyupInput}>
          ${record.tags.length ? html`
            <div class="tags">
              ${record.tags.filter(item => !!item.metadata['tag/id']).map(tag => {
                return html`
                  <div class="tag">
                    #${tag.metadata['tag/id'].slice(0, 25)}
                    ${isSameOrigin(tag.site.url, profileUrl) ? html`
                      <a class="remove" @click=${e => onClickRemove(e, tag)} title="Remove tag">
                        <span class="fas fa-times"></span>
                      </a>
                    ` : ''}
                    &ndash; <a href=${tag.site.url}>${tag.site.title}</a>
                  </div>
                `
              })}
            </div>
          ` : ''}
        </div>
      `
    }
  })
}