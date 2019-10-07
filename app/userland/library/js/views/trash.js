import { html } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from '../../../app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { DrivesView } from './drives'

const VIZ_OPTIONS = {
  grid: 'Grid',
  list: 'List'
}

class TrashView extends DrivesView {

  async load () {
    var items = await beaker.archives.listTrash()
    this.items = items
    console.log('loaded', this.items)
  }

  render () {
    document.title = 'Drives'
    let items = this.items

    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="header">
        <hover-menu
          icon="fas fa-th-list"
          .options=${VIZ_OPTIONS}
          current=${VIZ_OPTIONS[this.currentViz]}
          @change=${this.onChangeViz}
        ></hover-menu>
        <hr>
        <button @click=${this.onEmptyTrash} style="margin-left: 10px">
          <span class="fas fa-fw fa-trash"></span> Empty trash
        </button>
      </div>
      ${!items.length
        ? html`<div class="empty"><div><span class="far fa-sad-tear"></span></div>No drives found.</div>`
        : html`${repeat(this.groups, ([type, items]) => this.renderGroup(type, items))}`}
    `
  }

  async onEmptyTrash () {
    if (!confirm('Empty your trash? This will delete the dats from you computer.')) {
      return
    }
    await beaker.archives.collectTrash()
    this.load()
  }
}
customElements.define('trash-view', TrashView)
