import {LitElement, html} from '../../vendor/lit-element/lit-element.js'
import {classMap} from '../../vendor/lit-element/lit-html/directives/class-map.js'
import {repeat} from '../../vendor/lit-element/lit-html/directives/repeat.js'
import tabsCSS from '../../css/com/tabs-nav.css.js'

export class TabsNav extends LitElement {
  static get properties () {
    return {
      currentTab: {attribute: 'current-tab', reflect: true}
    }
  }

  get tabs () {
    // this should be overridden by subclasses
    return [
      {id: 'tab1', label: 'Tab 1'},
      {id: 'tab2', label: 'Tab 2'},
      {id: 'tab3', label: 'Tab 3'}
    ]
  }

  constructor () {
    super()
    this.currentTab = this.tabs[0].id
  }

  render () {
    return html`${repeat(this.tabs, tab => this.renderTab(tab))}`
  }

  renderTab (tab) {
    if (tab.spacer) return html`<span style="flex: 1"></span>`
    if (tab.type === 'html') return tab

    var {id, label, onClick} = tab
    const cls = classMap({active: this.currentTab === id})
    return html`<a class="${cls}" @click=${onClick ? onClick : e => this.onClickTab(e, id)}>${label}</a>`
  }

  onClickTab (e, id) {
    this.currentTab = id
    this.dispatchEvent(new CustomEvent('change-tab', {detail: {tab: id}}))
  }
}
TabsNav.styles = [tabsCSS]
