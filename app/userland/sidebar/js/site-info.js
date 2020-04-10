import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import css from '../css/site-info.css.js'
import { toNiceDomain } from 'beaker://app-stdlib/js/strings.js'

class SiteInfo extends LitElement {
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
    return urlp.origin + '/'
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
    if (this.isDrive) {
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
    }
    this.isLoading = false

    setTimeout(() => this.setAttribute('loaded', ''), 1e3)
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
    if (!this.isDrive) {
      return html`
        <link rel="stylesheet" href="beaker://assets/font-awesome.css">
        <section class="in1">
          <div class="heading"><span class="fas fa-fw fa-info"></span> About</div>
          <div class="content">${this.renderInfo()}</div>
        </section>
      `
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
    if (!this.isDrive) {
      let protocol = ''
      if (this.url.startsWith('https:')) protocol = html`<p class="protocol">Accessed using a secure connection</p>`
      if (this.url.startsWith('http:')) protocol = html`<p class="protocol">Accessed using an insecure connection</p>`
      if (this.url.startsWith('beaker:')) protocol = html`<p class="protocol">This page is served by Beaker</p>`
      return html`
        <h1>${this.hostname}</h1>
        ${protocol ? html`<p class="description">${protocol}</p>` : ''}
      `
    }
    var isSaved = this.driveCfg?.saved
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
        ${!this.driveCfg.ident.internal ? html`
          ${this.info.writable ? html`
            <button class="transparent" title=${isSaved ? 'Remove From My Library' : 'Restore To My Library'} @click=${this.onClickToggleSaved}>
              ${isSaved ? html`<span class="fas fa-trash"></span> Remove From My Library` : html`<span class="fas fa-trash-restore"></span> Readd To My Library`}
            </button>
          ` : html`
            <button class="transparent" title=${isSaved ? 'Stop Seeding' : 'Seed This Drive'} @click=${this.onClickToggleSaved}>
              ${isSaved ? html`<span class="fas fa-times"></span> Stop Seeding` : html`<span class="fas fa-share-alt"></span> Seed This Drive`}
            </button>
          `}
        ` : ``}
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
                    <button @click=${e => this.onClickDetach(e, fork)} data-tooltip="Detach"><span class="fas fa-unlink"></span></button>
                    <button @click=${e => this.onClickDelete(e, fork)} data-tooltip="Remove From Library"><span class="far fa-trash-alt"></span></button>
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

  async onClickDetach (e, fork) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`Make "${fork.forkOf.label}" an independent drive?`)) {
      return
    }

    var manifest = await beaker.hyperdrive.drive(fork.url).readFile('/index.json').then(JSON.parse).catch(e => {})
    delete manifest.forkOf
    await beaker.hyperdrive.drive(fork.url).writeFile('/index.json', JSON.stringify(manifest, null, 2))
    await beaker.drives.configure(fork.url, {forkOf: false})
    this.load(this.url)
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

customElements.define('site-info-app', SiteInfo)
