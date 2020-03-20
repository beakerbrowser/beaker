import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import css from '../css/drive-info.css.js'
import { toNiceDomain } from 'beaker://app-stdlib/js/strings.js'

class DriveInfo extends LitElement {
  static get properties () {
    return {
      url: {type: String},
      isLoading: {type: Boolean},
      info: {type: Object},
      driveCfg: {type: Object},
      forks: {type: Array},
      targetVersion: {type: Number}
    }
  }

  static get styles () {
    return [css]
  }

  get isDrive () {
    return this.url && this.url.startsWith('hyper:')
  }

  get origin () {
    let urlp = new URL(this.url)
    return urlp.origin
  }

  get hostname () {
    let urlp = new URL(this.url)
    return urlp.hostname
  }

  get viewedVersion () {
    try {
      return /\+(.+)$/.exec(this.origin)[1]
    } catch (e) {
      return this.info.version
    }
  }

  constructor () {
    super()
    this.url = undefined
    this.isLoading = true
    this.info = {}
    this.driveCfg = {}
    this.forks = []
    this.targetVersion = undefined

    const globalAnchorClickHandler = (isPopup) => e => {
      e.preventDefault()
      var a = e.path.reduce((acc, v) => acc || (v.tagName === 'A' ? v : undefined), undefined)
      if (a) {
        var href = a.getAttribute('href')
        if (href && href !== '#' && !href.startsWith('beaker://')) {
          if (isPopup || e.metaKey || a.getAttribute('target') === '_blank') {
            beaker.browser.openUrl(href, {setActive: true})
          } else {
            this.goto(href)
          }
        }
      }
    }
    this.addEventListener('auxclick', globalAnchorClickHandler(true))
    this.addEventListener('click', globalAnchorClickHandler(false))
  }

  teardown () {
  }

  async load (url) {
    this.url = url
    if (!this.isDrive) return
    this.isLoading = true

    try {
      this.info = {}
      // get drive info
      let drive = beaker.hyperdrive.drive(this.url)
      ;[this.info, this.driveCfg, this.forks] = await Promise.all([
        drive.getInfo(),
        beaker.drives.get(this.url),
        beaker.drives.getForks(this.url)
      ])

      // watch for network events
      if (!this.onNetworkChanged) {
        // TODO
        // this.onNetworkChanged = (e) => {
        //   this.info.peers = e.peers
        //   this.requestUpdate()
        // }
        // drive.addEventListener('network-changed', this.onNetworkChanged)
      }
    } catch (e) {
      console.error(e)
    }
    this.isLoading = false
  }

  goto (url) {
    beaker.browser.gotoUrl(url)
    this.load(url)
  }

  // rendering
  // =

  render () {
    if (this.isLoading) {
      return html`<div class="loading"><span class="spinner"></span></div>`
    }
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <section class="in1">
        <div class="heading"><span class="fas fa-fw fa-info"></span> About</div>
        <div class="content">${this.renderInfo()}</div>
      </section>
      <section class="in2">
        <div class="heading"><span class="fas fa-fw fa-code-branch"></span> Forks</div>
        <div class="content">${this.renderForks()}</div>
      </section>
      <section class="in3">
        <div class="heading"><span class="fas fa-fw fa-history"></span> History</div>
        <div class="content">${this.renderHistory()}</div>
      </section>
      ${''/*<section class="in4">
        <div class="heading"><span class="fas fa-fw fa-share-alt"></span> Peers</div>
        <div class="content">todo</div>
      </section>*/}
    `
  }

  renderInfo () {
    var isSaved = this.driveCfg?.saved
    var isSeeding = this.driveCfg?.seeding
    if (this.info && this.info.version === 0) {
      return html`
        <h1>Site not found</h1>
        <p class="description">Make sure the address is correct and try again</p>
      `
    }
    return html`
      <h1>${this.info.title}</h1>
      ${this.info.description ? html`<p class="description">${this.info.description}</p>` : ''}
      <div style="margin-top: 10px">
        <button class="transparent" title=${isSaved ? 'Saved to My Library' : 'Save to My Library'} @click=${this.onClickToggleSaved}>
          ${isSaved ? html`<span class="far fa-check-square"></span> Saved` : html`<span class="far fa-square"></span> Saved`}
        </button>
        <button class="transparent" title=${isSeeding ? 'Seeding' : 'Seed'} @click=${this.onClickToggleSeeding}>
          ${isSeeding ? html`<span class="far fa-check-square"></span> Seeding` : html`<span class="far fa-square"></span> Seeding`}
        </button>
        <button class="transparent" title="Drive Properties" @click=${this.onClickDriveProperties}><span class="far fa-list-alt"></span> Properties</button>
      </div>
    `
  }

  renderForks () {
    var currentFork = this.forks.find(f => f.url === this.origin)
    if (this.info && this.info.forkOf && this.forks.length <= 1) {
      return html`This drive is a fork of <a href=${this.info.forkOf}>${toNiceDomain(this.info.forkOf)}</a>`
    }
    if (!currentFork) {
      return html``
    }
    return html`
      ${this.forks.length > 1 ? html`
        <div class="list">
          ${repeat(this.forks, fork => {
            var isCurrent = fork.url === this.origin
            return html`
              <a class="fork ${isCurrent ? 'current' : ''}" href=${fork.url} @click=${this.onClickFork}>
                <div>
                  ${isCurrent ? html`<span class="fas fa-fw fa-caret-right"></span>` : ''}
                  <span class="fork-label">${fork.forkOf ? fork.forkOf.label : 'Original'}</span>
                </div>
                <div>
                  ${fork.forkOf ? html`
                    <button @click=${e => this.onClickDelete(e, fork)}><span class="far fa-trash-alt"></span></button>
                  ` : ''}
                </div>
              </a>
            `
          })}
        </div>
      ` : ''}
      <div>
        <button @click=${this.onClickNewFork}>+ New Fork</button>
        ${currentFork.forkOf ? html`
          <button @click=${e => this.onClickDiff(e, currentFork)}><span class="diff-merge-icon">◨</span> Diff / Merge Original</button>
        ` : html`
          <button disabled><span class="diff-merge-icon">◨</span> Diff / Merge Original</button>
        `}
      </div>
    `
  }

  renderHistory () {
    var targetVersion = this.targetVersion || this.viewedVersion
    const toLabel = v => (v == this.info.version) ? 'Latest' : `v${v}`
    var tickmarks = []
    for (let i = 0; i < +this.info.version; i++) {
      tickmarks.push(html`<option value=${i}></option>`)
    }
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="history-ctrls">
        <label for="version">Viewing: ${toLabel(targetVersion)}</label>
      </div>
      <div>
        <input
          type="range"
          id="version"
          name="version"
          min="1"
          max="${this.info.version}"
          value="${targetVersion}"
          step="1"
          @input=${this.onInputVersionSlider}
          @change=${this.onChangeVersionSlider}
        >
      </div>
    `
  }

  // events
  // =

  async onClickToggleSaved (e) {
    if (this.driveCfg?.saved) {
      await beaker.drives.remove(this.origin)
    } else {
      await beaker.drives.configure(this.origin)
    }
    this.load(this.url)
  }

  async onClickToggleSeeding (e) {
    if (this.driveCfg?.seeding) {
      await beaker.drives.configure(this.origin, {seeding: false})
    } else {
      await beaker.drives.configure(this.origin, {seeding: true})
    }
    this.load(this.url)
  }

  async onClickDriveProperties (e) {
    await beaker.shell.drivePropertiesDialog(this.origin)
    this.load(this.url)
  }

  async onClickNewFork (e) {
    e.preventDefault()
    e.stopPropagation()
    var drive = await beaker.hyperdrive.forkDrive(this.origin)
    this.goto(this.url.replace(this.origin, drive.url))
  }

  onClickFork (e) {
    e.preventDefault()
    e.stopPropagation()
    this.goto(this.url.replace(this.origin, e.currentTarget.getAttribute('href')))
  }

  onClickDiff (e, fork) {
    e.preventDefault()
    e.stopPropagation()
    beaker.browser.openUrl(`beaker://diff/?base=${fork.url}&target=${this.forks[0].url}`, {setActive: true})
  }

  async onClickDelete (e, fork) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`Delete "${fork.forkOf.label}"?`)) {
      return
    }
    await beaker.drives.remove(fork.url)
    this.forks.splice(this.forks.indexOf(fork), 1)
    this.requestUpdate()
  }

  onInputVersionSlider (e) {
    this.targetVersion = +e.currentTarget.value
  }

  onChangeVersionSlider (e) {
    var url = new URL(this.url)
    url.hostname = url.hostname.replace(/\+(.+)$/, '')
    if (this.targetVersion != this.info.version) {
      url.hostname += `+${this.targetVersion}`
    }
    this.goto(url.toString())
    this.targetVersion = undefined
  }
}

customElements.define('drive-info-app', DriveInfo)
