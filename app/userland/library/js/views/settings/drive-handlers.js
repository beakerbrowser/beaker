import { LitElement, html } from '../../../../app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from '../../../../app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import viewCSS from '../../../css/views/settings/drive-handlers.css.js'
import * as toast from '../../../../app-stdlib/js/com/toast.js'

class DriveHandlersView extends LitElement {
  static get properties () {
    return {
      items: {type: Array}
    }
  }

  static get styles () {
    return viewCSS
  }

  constructor () {
    super()
    this.items = []
  }

  async load () {
    this.items = await beaker.types.listDriveTypes()
    console.log('loaded', this.items)
  }

  // rendering
  // =

  render () {
    let items = this.items
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <h2>Default Handlers</h2>
      <table class="listing">
        ${repeat(items, item => this.renderItem(item))}
      </table>
    `
  }

  renderItem (item) {
    return html`
      <tr class="drive-type">
        <td><strong>${item.title}</strong><br><small>${item.id}</small></td>
        <td>
          <select @change=${e => this.onChange(e, item)}>
            ${repeat(item.handlers, h => html`
              <option value=${h.url} ?selected=${item.defaultHandler === h.url}>
                ${h.title}
              </option>
            `)}
          </select>
        </td>
      </tr>
    `
  }

  // events
  // =

  async onChange (e, item) {
    await beaker.types.setDefaultDriveHandler(item.id, e.target.value)
    toast.create('Settings updated')
  }
}
customElements.define('drive-handlers-view', DriveHandlersView)