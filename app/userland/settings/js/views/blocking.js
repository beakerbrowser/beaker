import { LitElement, html, css } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import viewCSS from '../../css/views/blocking.css.js'
import * as toast from '../../../app-stdlib/js/com/toast.js'
import { fancyUrl } from '../../../app-stdlib/js/strings.js'

class BlockingSettingsView extends LitElement {
  static get properties () {
    return {
    }
  }

  static get styles () {
    return viewCSS
  }

  constructor () {
    super()
    this.settings = undefined
    this.browserInfo = undefined
  }

  async load () {
    // fetch data
    this.browserInfo = await beaker.browser.getInfo()
    this.settings = await beaker.browser.getSettings()
    console.log('loaded', {
      browserInfo: this.browserInfo,
      settings: this.settings
    })
    this.requestUpdate()
  }

  // rendering
  // =

  render () {
    if (!this.browserInfo) return html``
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="form-group">
        <h2>Adblock Filter Lists</h2>
        ${this.renderAdblockFilterLists()}
      </div>
    `
  }

  renderAdblockFilterLists() {
    return html`
      <div class="section">
        <div class="adblock-settings-list">
          ${this.settings.adblock_lists.map((adblockList,i)=>{
            return html`
              <div class="checkbox-item">
                ${this.settings.adblock_lists.length === 1 ? '' : html`
                  <a @click="${()=>this.removeAdblockList(i)}" data-tooltip="Remove" title="Remove Adblock List">
                    <span class="fas fa-fw fa-times"></span>
                  </a>
                `}
                <input type="checkbox"
                  id="adblockList${i}"
                  name="adblock-lists"
                  value="${i}"
                  ?checked="${adblockList.selected}"
                  @change="${this.onAdblockListChange}"
                >
                <label for="adblockList${i}">
                  ${adblockList.name} <small>${adblockList.url}</small>
                </label>
              </div>`
            })
          }
        </div>
      </div>
      <form @submit=${this.onAddAdblockList}>
        <input type="text" placeholder="Name" id="custom-adblock-list-name" required>
        <input type="url" placeholder="URL" id="custom-adblock-list-url" required>
        <button type="submit">Add</button>
      </form>
    `
  }

  // events
  // =

  onAdblockListChange (e) {
    const index = e.target.value
    if (e.target.checked) {
      this.settings.adblock_lists[index].selected = true
    } else {
      delete this.settings.adblock_lists[index].selected
    }
    beaker.browser.setSetting('adblock_lists', this.settings.adblock_lists)
    beaker.browser.updateAdblocker()
    toast.create('Setting updated')
    this.requestUpdate()
  }

  removeAdblockList (i) {
    // decrement selected search engine so it points to the same one if the removed index is less than current one
    this.settings.adblock_lists.splice(i, 1)
    beaker.browser.setSetting('adblock_lists', this.settings.adblock_lists)
    beaker.browser.updateAdblocker()
    this.requestUpdate()
  }

  onAddAdblockList (e) {
    e.preventDefault()
    const name = this.shadowRoot.getElementById('custom-adblock-list-name')
    const url  = this.shadowRoot.getElementById('custom-adblock-list-url')
    this.settings.adblock_lists.push({name: name.value, url: url.value, selected: true})
    beaker.browser.setSetting('adblock_lists', this.settings.adblock_lists)
    beaker.browser.updateAdblocker()
    name.value =""
    url.value=""
    this.requestUpdate()
  }
}
customElements.define('blocking-settings-view', BlockingSettingsView)
