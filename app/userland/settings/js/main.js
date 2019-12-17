import { LitElement, html } from '../../app-stdlib/vendor/lit-element/lit-element.js'
import { classMap } from '../../app-stdlib/vendor/lit-element/lit-html/directives/class-map.js'
import * as QP from './lib/query-params.js'
import css from '../css/main.css.js'
import './views/drive-handlers.js'
import './views/general.js'
import './views/info.js'
import './views/fs-audit-log.js'
import './views/daemon-log.js'
import './views/log.js'
import './views/programs.js'

class SettingsApp extends LitElement {
  static get properties () {
    return {
      currentSubview: {type: String}
    }
  }

  static get styles () {
    return css
  }

  constructor () {
    super()
    this.currentSubview = QP.getParam('subview') || 'general'
    this.load()
  }

  async load () {
    try {
      await Promise.all(Array.from(this.shadowRoot.querySelectorAll('[loadable]'), el => el.unload()))
    } catch (e) {
      console.debug(e)
    }
    await this.requestUpdate()
    try {
      await Promise.all(Array.from(this.shadowRoot.querySelectorAll('[loadable]'), el => el.load()))
    } catch (e) {
      console.debug(e)
    }
  }

  // rendering
  // =

  render () {
    document.title = 'Settings'
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="subnav">${this.renderSubnav()}</div>
      <div class="subview">${this.renderSubview()}</div>
    `
  }

  renderSubnav () {
    const item = (id, icon, label) => {
      const cls = classMap({item: true, current: id === this.currentSubview})
      return html`
        <div class=${cls} @click=${e => this.onClickSubview(e, id)}><span class="fa-fw ${icon}"></span> ${label}</div>
      `
    }
    return html`
      ${item('general', 'fas fa-cog', 'General')}
      <hr>
      ${item('applications', 'far fa-window-restore', 'Applications')}
      ${item('commands', 'fas fa-terminal', 'Commands')}
      ${item('cloud-peers', 'fas fa-cloud', 'Cloud Peers')}
      ${item('users', 'fas fa-users', 'Users')}
      <hr>
      ${item('general-logs', 'fas fa-clipboard-list', 'General Logs')}
      ${item('fs-audit-log', 'fas fa-clipboard-check', 'Filesystem Audit Log')}
      ${item('daemon-log', 'fas fa-clipboard-list', 'Daemon Log')}
      ${item('info', 'far fa-question-circle', 'Information & Help')}
      <hr>
    `
  }

  renderSubview () {
    switch (this.currentSubview) {
      case 'applications':
        return html`
          <programs-view loadable type="application"></programs-view>
          <drive-handlers-view loadable></drive-handlers-view>
        `
      case 'commands':
        return html`<programs-view loadable type="webterm.sh/cmd-pkg"></programs-view>`
      case 'general':
        return html`<general-settings-view loadable></general-settings-view>`
      case 'info':
        return html`<info-settings-view loadable></info-settings-view>`
      case 'general-logs':
        return html`<log-settings-view loadable></log-settings-view>`
      case 'fs-audit-log':
        return html`<fs-audit-log-view loadable></fs-audit-log-view>`
      case 'daemon-log':
          return html`<daemon-log-view loadable></daemon-log-view>`
      default:
        return html`<div class="empty"><div><span class="fas fa-toolbox"></span></div>Under Construction</div>`
    }
  }

  // events
  // =

  onClickSubview (e, id) {
    this.currentSubview = id
    QP.setParams({subview: id})
    this.load()
  }
}

customElements.define('settings-app', SettingsApp)