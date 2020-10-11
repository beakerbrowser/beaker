import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import * as QP from './lib/qp.js'
import css from '../css/main.css.js'
import { toHex, isSameOrigin, toNiceDomain, shorten } from 'beaker://app-stdlib/js/strings.js'
import { timeDifference } from 'beaker://app-stdlib/js/time.js'
import bytes from 'beaker://app-stdlib/vendor/bytes/index.js'
import 'beaker://app-stdlib/js/com/hover-card.js'

class HypercoreToolsApp extends LitElement {
  static get styles () {
    return [css]
  }

  static get properties () {
    return {
      selectedDrive: {type: Object},
      selectedAPICall: {type: Number},
      currentView: {type: String},
      currentDriveView: {type: String}
    }
  }

  constructor () {
    super()
    beaker.panes.setAttachable()
    this.selectedDrive = undefined
    this.currentView = 'hypercores'
    this.currentDriveView = 'cores'
    this.url = undefined
    this.drivecores = []
    this.apiCallLog = []
    this.selectedAPICall = undefined
    this.auditLogStream = undefined

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
    if (!(url && this.url && isSameOrigin(url, this.url))) {
      this.selectedDrive = undefined
    }
    this.url = url
    this.drivecores = await beaker.hyperdebug.listCores(url)
    console.log(this.drivecores)
    this.requestUpdate()
    this.apiCallLog = []
    this.bindApiLogEvents()

    for (let drive of this.drivecores) {
      drive.url = `hyper://${toHex(drive.metadata.key)}`

      drive.metadata.downloadedBlockBits = await beaker.hyperdebug.hasCoreBlocks(drive.metadata.key, 0, drive.metadata.totalBlocks)
      drive.metadata.log = []
      this.bindCoreLogEvents(drive.metadata, drive.url, 'metadata')
      this.requestUpdate()

      drive.content.downloadedBlockBits = await beaker.hyperdebug.hasCoreBlocks(drive.content.key, 0, drive.content.totalBlocks)
      drive.content.log = []
      this.bindCoreLogEvents(drive.content, drive.url, 'content')
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

  async bindApiLogEvents () {
    this.selectedAPICall = undefined
    if (this.auditLogStream) this.auditLogStream.close()
    this.auditLogStream = await beaker.logger.streamAuditLog({caller: this.url, includeResponse: true})
    this.auditLogStream.addEventListener('data', e => {
      this.apiCallLog.push(e.detail)
      if (this.currentView === 'api-calls') {
        this.requestUpdate()
      }
    })
  }

  bindCoreLogEvents (core, url, corename) {
    const log = (...args) => {
      core.log.unshift(args.join(' '))
      this.requestUpdate()
    }
    var events = beaker.hyperdebug.createCoreEventStream(url, corename)
    events.addEventListener('ready', () => log('Ready'))
    events.addEventListener('opened', () => log('Opened'))
    events.addEventListener('error', (err) => log('Error', err))
    events.addEventListener('peer-add', (peer) => {
      core.peers++
      log('Peer Added:', peer.remoteAddress)
    })
    events.addEventListener('peer-remove', (peer) => {
      core.peers--
      log('Peer Removed:', peer.remoteAddress)
    })
    events.addEventListener('peer-open', (peer) => log('Peer Connected:', peer.remoteAddress))
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
    const mainNavItem = (id, label) => html`
      <a
        class="${id === this.currentView ? 'current' : ''}"
        @click=${e => this.currentView = id}
      >${label}</a>
    `
    const driveNavItem = (id, label) => html`
      <a
        class="${id === this.currentDriveView ? 'current' : ''}"
        @click=${e => this.currentDriveView = id}
      >${label}</a>
    `
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div id="hover-el"></div>
      <nav>
        ${mainNavItem('hypercores', 'Hypercores')}
        ${mainNavItem('api-calls', 'API Calls')}
      </nav>
      <main>
        ${this.currentView === 'hypercores' ? html`
          ${this.selectedDrive ? html`
            <div class="drives-list">
              <div class="drives-list-header">
                <div class="key">Key</div>
                <nav>
                  <a @click=${this.onClickDeselectDrive}>&times;</a>
                  ${driveNavItem('cores', 'Cores')}
                  ${driveNavItem('files', 'Files')}
                </nav>
              </div>
              <div class="drives-list-columns">
                <div class="list">
                  ${this.drivecores.map(this.renderDriveListItemShort.bind(this))}
                </div>
                <div class="view">
                  ${this.currentDriveView === 'cores' ? html`
                    ${this.renderDriveCores(this.selectedDrive)}
                  ` : this.currentDriveView === 'files' ? html`
                    ${this.renderDriveFiles(this.selectedDrive)}
                  ` : ''}
                </div>
              </div>
            </div>
          ` : html`
            <div class="drives-list">
              <div class="drives-list-header">
                <div class="key">Key</div>
                <div class="type">Type</div>
                <div class="initiator">Initiator</div>
                <div class="peers">Peers</div>
                <div class="blocks">Blocks</div>
              </div>
              ${this.drivecores.map(this.renderDriveListItemFull.bind(this))}
            </div>
          `}
        ` : ''}
        ${this.currentView === 'api-calls' ? html`
          <div class="api-calls-grid ${this.selectedAPICall !== undefined ? 'two' : 'one'}">
            <div>${this.renderAPICalls()}</div>
            ${this.selectedAPICall !== undefined ? html`
              <div>${this.renderSelectedAPICall()}</div>
            ` : ''}
          </div>
        ` : ''}
      </main>
    `
  }

  renderDriveListItemShort (drive, index) {
    let keyStr = toHex(drive.metadata.key)
    return html`
      <div
        class="drives-list-item ${this.selectedDrive === drive ? 'selected' : ''}"
        @click=${e => this.onClickDriveListItem(e, drive)}
      >
        <div class="key">${keyStr.slice(0, 8)}..${keyStr.slice(-2)}</div>
      </div>
    `
  }

  renderDriveListItemFull (drive, index) {
    let keyStr = toHex(drive.metadata.key)
    let totalBlocks = drive.metadata.totalBlocks + (drive.content.totalBlocks || 0)
    let downloadedBlocks = drive.metadata.downloadedBlocks + (drive.content.downloadedBlocks || 0)
    return html`
      <div
        class="drives-list-item ${this.selectedDrive === drive ? 'selected' : ''}"
        @click=${e => this.onClickDriveListItem(e, drive)}
      >
        <div class="key">${keyStr.slice(0, 8)}..${keyStr.slice(-2)}</div>
        <div class="type">Drive</div>
        <div class="initiator">${index === 0 ? 'Browser' : `Mount (${drive.path})`}</div>
        <div class="peers">${drive.metadata.peers}</div>
        <div class="blocks">${totalBlocks} (${Math.round(downloadedBlocks / totalBlocks * 100)}% downloaded)</div>
      </div>
    `
  }

  renderDriveCores (drive) {
    return html`
      <div class="drive">
        ${drive.path !== '/' ? html`<div class="mount-path">Mounted at ${drive.path}</div>` : ''}
        ${this.renderCore(drive.metadata, 'Metadata')}
        ${this.renderLog(drive.metadata, 'Metadata')}
        ${this.renderCore(drive.content, 'Content')}
        ${this.renderLog(drive.metadata, 'Content')}
      </div>
    `
  }

  renderDriveFiles (drive) {
    return html`
      <div class="drive">
        ${drive.path !== '/' ? html`<div class="mount-path">Mounted at ${drive.path}</div>` : ''}
        ${this.renderFiles(drive)}
      </div>
    `
  }

  renderCore (core, label) {
    if (!core.key) {
      return html`
      <section class="core">
        <div class="label">${label} Core</div>
        <div class="error">Not loaded</div>
      </section>
      `
    }
    return html`
      <section class="core">
        <div class="label">
          ${label} Core
          <beaker-hover-card>
            <span slot="el" class="discovery-key-icon fas fa-info-circle"></span>
            <div slot="card" class="discovery-key"><strong>Discovery Key:</strong><br>${toHex(core.discoveryKey)}</div></div>
          </beaker-hover-card>
        </div>
        <div class="key">
          ${toHex(core.key)}
        </div>
        <div class="stats">
          <span class="peers"><small>Peers:</small> ${core.peers}</span>
          <span class="blocks-summary"><small>Blocks:</small> ${core.totalBlocks}</span>
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
      return html`<section class="files error"><div class="label">Files</div>${drive.filesError}</section>`
    }
    if (!drive.files) {
      return html`<section class="files loading"><div class="label">Files</div><span class="spinner"></span></section>`
    }
    return html`
      <section class="files">
        <div class="file-header">
          <span class="indicator"></span>
          <span class="path">Path</span>
          <span class="size">Size</span>
          <span class="offset">Offset</span>
          <span class="blocks">Blocks</span>
        </div>
        ${drive.files.map(file => {
          var d = file.stat.size === 0 || isRangeDownloaded(
            drive.content.downloadedBlockBits,
            file.stat.offset,
            file.stat.blocks
          )
          return html`
            <div class="file ${d ? 'downloaded' : ''}">
              <span class="indicator"></span>
              <a class="path" href="${drive.url}/${file.name}" target="_blank">/${file.name}</a>
              <span class="size">${bytes(file.stat.size)}</span>
              <span class="offset">${file.stat.offset}</span>
              <span class="blocks">${file.stat.blocks}</span>
            </div>
          `
        })}
      </section>
    `
  }

  renderAPICalls () {
    return html`
      <div class="api-calls">
        <table class="rows">
          <thead>
            <tr class="logger-row">
              <th class="method">method</th>
              <th class="runtime">run time</th>
              <th class="args">args</th>
            </tr>
          </thead>
          <tbody>${this.apiCallLog.map((row, i) => {
            return html`
              <tr
                class="logger-row ${this.selectedAPICall === i ? 'selected' : ''}"
                @click=${e => {this.selectedAPICall = i}}
              >
                <td class="method"><code>${row.method}</code></td>
                <td class="runtime"><code>${row.runtime}ms</code></td>
                <td class="args"><code>${shorten(row.args, 100)}</code></td>
              </tr>
            `
          })}</tbody>
        </table>
      </div>
    `
  }

  renderSelectedAPICall () {
    var call = this.apiCallLog[this.selectedAPICall]
    console.log(call)
    if (!call) return ''
    var args = call.args
    try { args = JSON.parse(args) }
    catch {}
    return html`
      <div class="api-call-details">
        <div><strong>Method</strong></div>
        <div>${call.method}</div>
        <div><strong>Run time</strong></div>
        <div>${call.runtime}ms</div>
        <div><strong>Arguments</strong></div>
        <div>
          ${call.method === 'index.gql' ? html`
            <pre>${multilineTrim(args.query)}</pre>
            <pre>${JSON.stringify(args.variables, null, 2)}</pre>
          ` : html`
            <pre>${JSON.stringify(args, null, 2)}</pre>
          `}
        </div>
        ${call.response ? html`
          <div><strong>Result</strong></div>
          <div><pre>${JSON.stringify(call.response, null, 2)}</pre></div>
        ` : ''}
      </div>
    `
  }

  // events
  // =

  onClickDeselectDrive (e) {
    this.selectedDrive = undefined
  }

  onClickDriveListItem (e, drive) {
    this.selectedDrive = drive
  }

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

function isRangeDownloaded (bits, offset, blocks) {
  for (let i = offset; i < (offset + blocks); i++) {
    if (!bits[i]) return false
  }
  return true
}

function multilineTrim (str) {
  var start = undefined
  var lines = str.split('\n')
  var out = []
  for (let line of lines) {
    if (typeof start === 'undefined') {
      start = /\S/.exec(line)?.index
    }
    if (typeof start === 'undefined') {
      continue
    }
    out.push(line.slice(start))
  }
  return out.join('\n')
}