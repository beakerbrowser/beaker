import { LitElement, html } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import viewCSS from '../../css/views/general.css.js'
import * as toast from '../../../app-stdlib/js/com/toast.js'

class GeneralSettingsView extends LitElement {
  static get properties () {
    return {
    }
  }

  static get styles () {
    return viewCSS
  }

  constructor () {
    super()
    this.browserEvents = undefined
    this.settings = undefined
    this.browserInfo = undefined
    this.defaultProtocolSettings = undefined
  }

  get isAutoUpdateEnabled () {
    return this.settings && ((+this.settings.auto_update_enabled) === 1)
  }

  async load () {
    // wire up events
    this.browserEvents = beaker.browser.createEventsStream()
    this.browserEvents.addEventListener('updater-state-changed', this.onUpdaterStateChanged.bind(this))
    this.browserEvents.addEventListener('updater-error', this.onUpdaterError.bind(this))

    // fetch data
    this.browserInfo = beaker.browser.getInfo()
    this.settings = await beaker.browser.getSettings()
    this.defaultProtocolSettings = await beaker.browser.getDefaultProtocolSettings()
    console.log('loaded', {
      browserInfo: this.browserInfo,
      settings: this.settings,
      defaultProtocolSettings: this.defaultProtocolSettings
    })
    this.requestUpdate()
  }

  unload () {
    this.browserEvents.close()
  }

  // rendering
  // =

  render () {
    if (!this.browserInfo) return html``
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      ${this.renderAutoUpdater()}
      ${this.renderOnStartupSettings()}
      ${this.renderProtocolSettings()}
      ${this.renderAnalyticsSettings()}
    `
  }

  renderAutoUpdater () {
    if (!this.browserInfo.updater.isBrowserUpdatesSupported) {
      return html`
        <div class="section">
          <h2 id="auto-updater">Auto updater</h2>
  
          <div class="message info">
            Sorry! Beaker auto-updates are only supported on the production build for macOS and Windows.
          </div>
  
          <p>
            To get the most recent version of Beaker, you'll need to <a href="https://github.com/beakerbrowser/beaker">
            build Beaker from source</a>.
          </p>
        </div>
      `
    }

    switch (this.browserInfo.updater.state) {
      default:
      case 'idle':
        return html`
        <div class="section">
          <h2 id="auto-updater">
            Auto updater
          </h2>
  
          ${this.browserInfo.updater.error ? html`
            <div class="message error">
              <i class="fa fa-exclamation-triangle"></i>
              ${this.browserInfo.updater.error}
            </div>
          ` : ''}
  
          <div class="auto-updater">
            <p>
              <button class="btn btn-default" @click=${this.onClickCheckUpdates}>Check for updates</button>
  
              <span class="up-to-date">
                <span class="fa fa-check"></span>
                Beaker v${this.browserInfo.version} is up-to-date
              </span>
            </p>
  
            <p>
              ${this.renderAutoUpdateCheckbox()}
            </p>
  
            <div class="prereleases">
              <h3>Advanced</h3>
              <button class="btn" @click=${this.onClickCheckPrereleases}>
                Check for beta releases
              </button>
            </div>
          </div>
        </div>`

      case 'checking':
        return html`
        <div class="section">
          <h2 id="auto-updater">
            Auto updater
          </h2>
  
          <div class="auto-updater">
            <p>
              <button class="btn" disabled>Checking for updates</button>
              <span class="version-info">
                <div class="spinner"></div>
                Checking for updates...
              </span>
            </p>
  
            <p>
              ${this.renderAutoUpdateCheckbox()}
            </p>
  
            <div class="prereleases">
              <h3>Advanced</h3>
              <button class="btn" @click=${this.onClickCheckPrereleases}>
                Check for beta releases
              </button>
            </div>
          </div>
        </div>`

      case 'downloading':
        return html`
        <div class="section">
          <h2 id="auto-updater">Auto updater</h2>
  
          <div class="auto-updater">
            <button class="btn" disabled>Updating</button>
            <span class="version-info">
              <div class="spinner"></div>
              Downloading the latest version of Beaker...
            </span>
            ${this.renderAutoUpdateCheckbox()}
          </div>
        </div>`

      case 'downloaded':
        return html`
        <div class="section">
          <h2 id="auto-updater">Auto updater</h2>
  
          <div class="auto-updater">
            <button class="btn" @click=${this.onClickRestart}>Restart now</button>
            <span class="version-info">
              <i class="fa fa-arrow-circle-o-up"></i>
              <strong>New version available.</strong> Restart Beaker to install.
            </span>
            ${this.renderAutoUpdateCheckbox()}
          </div>
        </div>`
    }
  }

  renderAutoUpdateCheckbox () {
    return html`<label>
      <input type="checkbox" ?checked=${this.isAutoUpdateEnabled} @click=${this.onToggleAutoUpdate} /> Check for updates automatically
    </label>`
  }

  renderOnStartupSettings () {
    return html`
      <div class="section on-startup">
        <h2 id="on-startup">Startup settings</h2>
  
        <p>When Beaker starts</p>
  
        <div>
          <input type="radio" id="customStartPage1" name="custom-start-page"
                 value="blank"
                 ?checked=${this.settings.custom_start_page === 'blank'}
                 @change=${this.onCustomStartPageChange} />
          <label for="customStartPage1">
            Show a new tab
          </label>
        </div>
        <div>
          <input type="radio" id="customStartPage2" name="custom-start-page"
                 value="previous"
                 ?checked=${this.settings.custom_start_page === 'previous'}
                 @change=${this.onCustomStartPageChange} />
          <label for="customStartPage2">
            Show tabs from your last session
          </label>
        </div>
      </div>
    `
  }

  renderProtocolSettings () {
    const toggleRegistered = (protocol) => {
      // update and optimistically render
      this.defaultProtocolSettings[protocol] = !this.defaultProtocolSettings[protocol]

      if (this.defaultProtocolSettings[protocol]) {
        beaker.browser.setAsDefaultProtocolClient(protocol)
      } else {
        beaker.browser.removeAsDefaultProtocolClient(protocol)
      }
      toast.create('Setting updated')
      this.requestUpdate()
    }

    return html`
      <div class="section default-browser">
        <h2 id="protocol" class="subtitle-heading">Default browser settings</h2>
  
        <p>Set Beaker as the default browser for:</p>
  
        ${Object.keys(this.defaultProtocolSettings).map(proto => html`
          <div>
            <label>
              <input ?checked=${this.defaultProtocolSettings[proto]} type="checkbox" @change=${() => toggleRegistered(proto)} />
    
              <span class="text">
                ${proto}://
              </span>
            </label>
          </div>
        `)}
      </div>`
  }

  renderAnalyticsSettings () {
    const toggle = () => {
      // update and optimistically render
      this.settings.analytics_enabled = (this.settings.analytics_enabled == 1) ? 0 : 1
      beaker.browser.setSetting('analytics_enabled', this.settings.analytics_enabled)
      this.requestUpdate()
      toast.create('Setting updated')
    }

    return html`
      <div class="section analytics">
        <h2 class="subtitle-heading">Beaker Analytics</h2>
  
        <div>
          <label>
            <input ?checked=${this.settings.analytics_enabled == 1} type="checkbox" @change=${toggle} />
            <span>
              Enable analytics
            </span>
          </label>
        </div>
  
        <div class="message">
          <p>Help us know how we${"'"}re doing! Enabling analytics will send us the following information once a week:</p>
  
          <ul>
            <li>An anonymous ID</li>
            <li>Your Beaker version, e.g. ${this.browserInfo.version}</li>
            <li>Your operating system, e.g. Windows 10</li>
          </ul>
        </div>
      </div>`
  }

  // events
  // =

  onUpdaterStateChanged (e) {
    console.debug('onUpdaterStateChanged', e)
    if (!this.browserInfo) { return }
    this.browserInfo.updater.state = e.state
    this.browserInfo.updater.error = false
    this.requestUpdate()
  }

  onUpdaterError (err) {
    console.debug('onUpdaterError', err)
    if (!this.browserInfo) { return }
    this.browserInfo.updater.error = err.message
    this.requestUpdate()
  }

  onClickCheckUpdates () {
    // trigger check
    beaker.browser.checkForUpdates()
  }

  onClickCheckPrereleases (e) {
    e.preventDefault()
    beaker.browser.checkForUpdates({prerelease: true})
  }

  onClickRestart () {
    beaker.browser.restartBrowser()
  }

  onToggleAutoUpdate () {
    this.settings.auto_update_enabled = this.isAutoUpdateEnabled ? 0 : 1
    this.requestUpdate()
    beaker.browser.setSetting('auto_update_enabled', this.settings.auto_update_enabled)
    toast.create('Setting updated')
  }

  onCustomStartPageChange (e) {
    this.settings.custom_start_page = e.target.value
    beaker.browser.setSetting('custom_start_page', this.settings.custom_start_page)
    toast.create('Setting updated')
  }
}
customElements.define('general-settings-view', GeneralSettingsView)