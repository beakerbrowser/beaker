import { LitElement, html } from '../../../../app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from '../../../../app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { writeToClipboard } from '../../../../app-stdlib/js/clipboard.js'
import * as toast from '../../../../app-stdlib/js/com/toast.js'
import * as contextMenu from '../../../../app-stdlib/js/com/context-menu.js'
import viewCSS from '../../../css/views/settings/programs.css.js'
import * as QP from '../../lib/query-params.js'
import { oneof } from '../../lib/validation.js'

class ProgramsView extends LitElement {
  static get properties () {
    return {
      user: {type: Object},
      items: {type: Array},
      type: {type: String},
      currentSort: {type: String}
    }
  }

  static get styles () {
    return viewCSS
  }

  get userUrl () {
    return this.user ? this.user.url : ''
  }

  constructor () {
    super()
    this.currentSort = oneof(QP.getParam('sort'), 'mtime', ['mtime', 'title'])
    this.items = []
    this.type = undefined
  }

  async load () {
    // fetch listing
    this.items = await beaker.programs.listPrograms({type: this.type})
    console.log('loaded', this.items)
  }

  showMenu (item, x, y, isContextMenu) {
    let url = item.url
    var items = [
      {icon: 'fas fa-fw fa-external-link-alt', label: 'Open in new tab', click: () => beaker.browser.openUrl(url, {setActive: true}) },
      {
        icon: 'fas fa-fw fa-link',
        label: 'Copy URL',
        click: () => {
          writeToClipboard(url)
          toast.create('Copied to your clipboard')
        }
      },
    ]
    if (url.startsWith('dat://')) {
      items.push('-')
      items.push({
        icon: 'fas fa-fw fa-trash',
        label: 'Uninstall',
        click: async () => {
          await beaker.programs.uninstallProgram(url)

          const undo = async () => {
            await beaker.programs.installProgram(item.url, item.version)
            this.load()
          }
          toast.create('Uninstalled', '', 10e3, {label: 'Undo', click: undo})

          this.load()
        }
      })
    }

    contextMenu.create({
      x,
      y,
      right: !isContextMenu,
      withTriangle: !isContextMenu,
      roomy: !isContextMenu,
      noBorders: true,
      fontAwesomeCSSUrl: 'beaker://assets/font-awesome.css',
      style: `padding: 4px 0`,
      items
    })
  }

  // rendering
  // =

  render () {
    let items = this.items
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      ${''/*<div class="header">
        <hover-menu
          icon="fas fa-sort-amount-down"
          .options=${SORT_OPTIONS}
          current=${SORT_OPTIONS[this.currentSort]}
          @change=${this.onChangeSort}
        ></hover-menu>
      </div>*/}
      <h2>Installed</h2>
      ${!items.length
        ? html`<div class="empty">No programs found</div>`
        : ''}
      <div class="listing">
        ${repeat(items, item => this.renderItem(item))}
      </div>
    `
  }

  renderItem (item) {
    return html`
      <a class="item" href=${item.url} @contextmenu=${e => this.onContextMenu(e, item)}>
        <div class="favicon">
          <img src="asset:favicon:${item.url}?cache_buster=${Date.now()}">
        </div>
        <div class="details">
          <div class="title">${item.manifest.title || html`<em>Untitled</em>`}</div>
          <div class="description">${item.manifest.description || html`<em>No description</em>`}</div>
          <div class="author">by ${item.author ? item.author.title : html`<em>Unknown</em>`}</div>
        </div>
      </a>
    `
  }

  // events
  // =

  onChangeSort (e) {
    this.currentSort = e.detail.id
    QP.setParams({sort: this.currentSort})
    this.load()
  }

  onContextMenu (e, item) {
    e.preventDefault()
    e.stopPropagation()

    this.showMenu(item, e.clientX, e.clientY, true)
  }

  onClickItemMenu (e, item) {
    e.preventDefault()
    e.stopPropagation()

    var rect = e.currentTarget.getClientRects()[0]
    this.showMenu(item, rect.right + 4, rect.bottom + 8, false)
  }
}
customElements.define('programs-view', ProgramsView)