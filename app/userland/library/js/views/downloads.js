import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { writeToClipboard } from 'beaker://app-stdlib/js/clipboard.js'
import bytes from 'beaker://app-stdlib/vendor/bytes/index.js'
import { toNiceDomain } from 'beaker://app-stdlib/js/strings.js'
import downloadsCSS from '../../css/views/downloads.css.js'

export class DownloadsView extends LitElement {
  static get properties () {
    return {
      downloads: {type: Array},
      filter: {type: String}
    }
  }

  static get styles () {
    return downloadsCSS
  }

  constructor () {
    super()
    this.downloads = undefined
    this.filter = undefined
  }

  async load () {
    this.downloads = await beaker.downloads.getDownloads()
    console.log(this.downloads)

    var dlEvents = beaker.downloads.createEventsStream()
    dlEvents.addEventListener('updated', this.onUpdateDownload.bind(this))
    dlEvents.addEventListener('done', this.onUpdateDownload.bind(this))
  }

  // rendering
  // =

  render () {
    var downloads = this.downloads
    if (downloads && this.filter) {
      downloads = downloads.filter(download => (
        download.name.toLowerCase().includes(this.filter)
      ))
    }
    return html`
      <link rel="stylesheet" href="beaker://app-stdlib/css/fontawesome.css">
      ${downloads ? html`
        <div class="downloads">
          ${repeat(downloads, download => this.renderDownload(download))}
          ${downloads.length === 0 ? html`
            <div class="empty">No downloads found</div>
          ` : ''}
        </div>
      ` : html`
        <div class="loading"><span class="spinner"></span></div>
      `}
    `
  }

  renderDownload (download) {
    var metadataEl = ''
    var progressEl = ''

    if (download.state == 'progressing') {
      var status = (download.isPaused) ? 'Paused' : (bytes(download.downloadSpeed || 0) + '/s')
      var controls = ''
      var cls = 'progressing'

      var cancelBtn = html`
        <button
          data-tooltip="Cancel download"
          @click=${() => this.onCancelDownload(download)}
          class="transparent tooltip-left"
        >
          <i title="Cancel download" class="fa fa-stop"></i>
        </button>
      `

      const progressPercentage = Math.floor((download.receivedBytes / download.totalBytes) * 100)
      progressEl = html`
        <progress max="100" value="${progressPercentage}"> ${progressPercentage}% </progress>
      `

      if (download.isPaused) {
        controls = html`
          ${cancelBtn}
          <button
            data-tooltip="Resume download"
            class="transparent tooltip-left"
            @click=${() => this.onResumeDownload(download)}
          >
            <i class="fa fa-play"></i>
          </button>
        `
      } else {
        controls = html`
          ${cancelBtn}
          <button
            data-tooltip="Pause download"
            class="transparent tooltip-left"
            @click=${() => this.onPauseDownload(download)}
          >
            <i class="fa fa-pause"></i>
          </button>
        `
      }

      metadataEl = html`
        <div class="metadata">
          ${progressEl}
          ${bytes(download.receivedBytes || 0)} / ${bytes(download.totalBytes || 0)}
          (${status})
        </div>
      `
    } else {
      // actions
      var actions
      if (!download.fileNotFound) {
        var removeBtn = html`
          <button
            data-tooltip="Remove from downloads"
            @click=${e => this.onRemoveDownload(download)}
            class="transparent tooltip-left"
          >
            <i class="fa fa-times"></i>
          </button>
        `

        actions = [
          html`
            <span class="link show" @click=${e => { e.stopPropagation(); this.onShowDownload(download) }}>
              Show in folder
            </span>
          `
        ]
      } else {
        actions = [
          html`<span>File not found (moved or deleted)</span>`
        ]
      }

      metadataEl = html`
        <div class="metadata">
          <span>${bytes(download.totalBytes || 0)}</span>
          ${actions}
        </div>
      `
    }

    // render download
    return html`
      <div class="download ${cls}" @dblclick=${(e) => this.onOpenDownload(download)}>
        <div class="title">
          <strong>${download.name}</strong>
          <span class="url">${toNiceDomain(download.url)}</span>
        </div>
        ${metadataEl}
        <div class="controls">
          ${controls}
          ${removeBtn}
        </div>
      </div>
    `
  }

  // events
  // =

  onUpdateDownload (download) {
    // patch data each time we get an update
    var target = this.downloads.find(d => d.id === download.id)
    if (target) {
      // patch item
      for (var k in download)
        target[k] = download[k]
    } else {
      this.downloads.push(download)
    }
    this.requestUpdate()
  }

  onPauseDownload (download) {
    beaker.downloads.pause(download.id)
  }

  onResumeDownload (download) {
    beaker.downloads.resume(download.id)
  }

  onCancelDownload (download) {
    beaker.downloads.cancel(download.id)
  }

  onCopyDownloadLink (download) {
    writeToClipboard(download.url)
  }

  onShowDownload (download) {
    beaker.downloads.showInFolder(download.id)
      .catch(err => {
        download.fileNotFound = true
        this.requestUpdate()
      })
  }

  onOpenDownload (download) {
    beaker.downloads.open(download.id)
      .catch(err => {
        download.fileNotFound = true
        this.requestUpdate()
      })
  }

  onRemoveDownload (download) {
    beaker.downloads.remove(download.id)
    this.downloads.splice(this.downloads.indexOf(download), 1)
    this.requestUpdate()
  }
}

customElements.define('downloads-view', DownloadsView)