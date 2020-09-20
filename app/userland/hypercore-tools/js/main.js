import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import * as QP from './lib/qp.js'
import css from '../css/main.css.js'
import { toHex, pluralize } from 'beaker://app-stdlib/js/strings.js'

class HypercoreToolsApp extends LitElement {
  static get styles () {
    return [css]
  }

  static get properties () {
    return {
    }
  }

  constructor () {
    super()
    beaker.panes.setAttachable()
    this.url = undefined
    this.drivecores = []

    var ignoreNextAttachEvent = false
    beaker.panes.addEventListener('pane-attached', e => {
      if (!ignoreNextAttachEvent) {
        this.load(beaker.panes.getAttachedPane().url)
      }
      ignoreNextAttachEvent = false
    })
    beaker.panes.addEventListener('pane-navigated', e => {
      this.load(e.detail.url)
    })

    ;(async () => {
      var url = QP.getParam('url')
      var attachedPane = await beaker.panes.attachToLastActivePane()
      ignoreNextAttachEvent = !!attachedPane
      if (url) {
        this.load(url)
      } else {
        if (attachedPane) this.load(attachedPane.url)
      }
    })()
  }

  async load (url) {
    if (!url?.startsWith('hyper://')) {
      return
    }
    QP.setParams({url})
    this.url = url
    this.drivecores = await beaker.hyperdebug.listCores(url)
    console.log(this.drivecores)
    this.requestUpdate()

    for (let drive of this.drivecores) {
      drive.url = `hyper://${toHex(drive.metadata.key)}`

      drive.metadata.downloadedBlockBits = await beaker.hyperdebug.hasCoreBlocks(drive.metadata.key, 0, drive.metadata.totalBlocks)
      drive.metadata.log = []
      this.bindLogEvents(drive.metadata, drive.url, 'metadata')
      this.requestUpdate()

      drive.content.downloadedBlockBits = await beaker.hyperdebug.hasCoreBlocks(drive.content.key, 0, drive.content.totalBlocks)
      drive.content.log = []
      this.bindLogEvents(drive.content, drive.url, 'content')
      this.requestUpdate()

      try {
        drive.files = await beaker.hyperdrive.readdir(drive.url, {recursive: true, includeStats: true})
        drive.files.sort((a, b) => a.name.localeCompare(b.name))
      } catch (e) {
        drive.filesError = e.toString()
      }
      this.requestUpdate()
    }
  }

  bindLogEvents (core, url, corename) {
    const log = (...args) => {
      core.log.unshift(args.join(' '))
      this.requestUpdate()
    }
    var events = beaker.hyperdebug.createCoreEventStream(url, corename)
    events.addEventListener('ready', () => log('Ready'))
    events.addEventListener('opened', () => log('Opened'))
    events.addEventListener('error', (err) => log('Error', err))
    events.addEventListener('peer-add', (peer) => log('Peer Added:', JSON.stringify(peer)))
    events.addEventListener('peer-remove', (peer) => log('Peer Removed:', JSON.stringify(peer)))
    events.addEventListener('peer-open', (peer) => log('Peer Connected:', JSON.stringify(peer)))
    events.addEventListener('download', (index) => {
      core.downloadedBlockBits[index] = true
      log('Downloaded block', index)
    })
    events.addEventListener('upload', (index) => log('Uploading block', index))
    events.addEventListener('append', () => log('Block appended'))
    events.addEventListener('sync', () => log('Sync'))
    events.addEventListener('close', () => log('Closed'))
  }

  setHoverEl (visible, {label, left, top} = {}) {
    let el = this.shadowRoot.querySelector('#hover-el')
    if (visible) {
      el.style.visibility = 'visible'
      el.style.left = left + 'px'
      el.style.top = top + 'px'
      el.textContent = label
    } else {
      el.style.visibility = 'hidden'
    }
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div id="hover-el"></div>
      <div class="drives">
        ${this.drivecores.map(this.renderDrive.bind(this))}
      </div>
    `
  }

  renderDrive (drive) {
    return html`
      <div class="drive">
        <div class="path">${drive.path}</div>
        ${this.renderCore(drive.metadata, 'Metadata')}
        ${this.renderLog(drive.metadata, 'Metadata')}
        ${this.renderCore(drive.content, 'Content')}
        ${this.renderLog(drive.metadata, 'Content')}
        ${this.renderFiles(drive)}
      </div>
    `
  }

  renderCore (core, label) {
    return html`
      <section class="core">
        <div class="label">${label} Core</div>
        <div class="key"><strong>Key:</strong> ${toHex(core.key)}</div>
        <div class="key"><strong>Discovery Key:</strong> ${toHex(core.discoveryKey)}</div>
        <div class="peers"><strong>Peers:</strong> ${core.peers}</div>
        <div class="blocks-summary">
          <strong>Blocks:</strong>
          ${core.totalBlocks} ${pluralize(core.totalBlocks, 'block')} /
          ${core.downloadedBlocks} downloaded
          (${Math.round(core.downloadedBlocks / core.totalBlocks * 100)}%)
        </div>
        <div class="blocks-grid">
          ${this.renderBlocks(core)}
        </div>
      </section>
    `
  }

  renderLog (core, label) {
    return html`
      <section class="log">
        <div class="label">${label} Core Log</div>
        <div class="entries">
          ${core.log?.map(entry => html`<div>${entry}</div>`)}
        </div>
      </section>
    `
  }

  renderBlocks (core) {
    var blockEls = []
    for (let i = 0; i < core.totalBlocks; i++) {
      blockEls.push(html`<div
        class="block ${core.downloadedBlockBits?.[i] ? 'downloaded' : ''}"
        data-index=${i}
        data-downloaded=${core.downloadedBlockBits?.[i] ? '1' : undefined}
        @mouseover=${this.onMouseoverBlock}
        @mouseout=${this.onMouseoutBlock}
      ></div>`)
    }
    return blockEls
  }

  renderFiles (drive) {
    if (drive.filesError) {
      return html`<div class="files error"><div class="label">Files</div>${drive.filesError}</div>`
    }
    if (!drive.files) {
      return html`<div class="files loading"><div class="label">Files</div><span class="spinner"></span></div>`
    }
    return html`
      <section class="files">
        <div class="label">Files</div>
        ${drive.files.map(file => {
          var d = file.stat.size === 0 || drive.content.downloadedBlockBits[file.stat.offset]
          return html`
            <div class="file ${d ? 'downloaded' : ''}">
              <span class="indicator"></span>
                <a href="${drive.url}/${file.name}" target="_blank">/${file.name} <small>[${file.stat.offset}]</small></a>
            </div>
          `
        })}
      </section>
    `
  }

  // events
  // =

  onMouseoverBlock (e) {
    let rect = e.currentTarget.getClientRects()[0]
    e.currentTarget.classList.add('hover')
    this.setHoverEl(true, {
      label: `Block ${e.currentTarget.dataset.index} (${e.currentTarget.dataset.downloaded == '1' ? '' : 'Not '}Downloaded)`,
      left: rect.left,
      top: rect.bottom + 10
    })
  }

  onMouseoutBlock (e) {
    e.currentTarget.classList.remove('hover')
    this.setHoverEl(false)
  }
}

customElements.define('hypercore-tools-app', HypercoreToolsApp)
