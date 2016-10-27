import * as yo from 'yo-yo'
import speedometer from 'speedometer'
import prettyBytes from 'pretty-bytes'
import { throttle } from '../../lib/functions'

const RERENDER_INTERVAL = 500 // .5s
const RERENDER_THROTTLE = 500 // .5s

// NOTE
// this does not clean up CBs until the page is destroyed!
export default function Stats (emitter, { archiveInfo, onToggleServing }) {
  if (!(this instanceof Stats)) return new Stats(emitter)

  this.emitter = emitter
  this.archiveInfo = archiveInfo
  this.uploadSpeed = speedometer()
  this.downloadSpeed = speedometer()
  this.onToggleServing = onToggleServing

  this.onUpdatePeers = ({ key, peers }) => {
    if (key === archiveInfo.key) {
      this.archiveInfo.peers = peers
      this.updateActives()
    }
  }
  this.onDownload = ({ key, index, bytes }) => {
    if (key === archiveInfo.key) {
      this.downloadSpeed(bytes)
      this.updateActives()
    }
  }
  this.onUpload = ({ key, index, bytes }) => {
    if (key === archiveInfo.key) {
      this.uploadSpeed(bytes)
      this.updateActives()
    }
  }

  // wire up events
  emitter.on('update-peers', this.onUpdatePeers)
  // emitter.on('update-blocks') TODO needed?
  emitter.on('download', this.onDownload)
  emitter.on('upload', this.onUpload)

  // setup periodic render
  // (if this wasnt done, the transfer rates would never drop to 0)
  this.updateInterval = setInterval(() => {
    this.updateActives()
  }, RERENDER_INTERVAL)
}

Stats.prototype.destroy = function () {
  clearInterval(this.updateInterval)
  this.emitter.removeListener('update-peers', this.onUpdatePeers)
  this.emitter.removeListener('download', this.onDownload)
  this.emitter.removeListener('upload', this.onUpload)
}

Stats.prototype.render = function () {
  if (!isNetworked(this.archiveInfo)) {
    // Dont render anything if not serving
    return  yo`<div class="hypercore-stats"></div>`
  }
  var us = prettyBytes(this.uploadSpeed()) + '/s'
  var ds = prettyBytes(this.downloadSpeed()) + '/s'
  return yo`<div class="hypercore-stats">
    <span class="hs-peers">${this.archiveInfo.peers} peers</span>
    <span class="download-speed"><span class="icon icon-down"></span> ${ds}</span>
    <span class="upload-speed"><span class="icon icon-up"></span> ${us}</span>
  </div>`
}

Stats.prototype.updateActives = throttle(function () {
  // render all active widgets
  Array.from(document.querySelectorAll('.hypercore-stats')).forEach(el => yo.update(el, this.render()))
}, RERENDER_THROTTLE)
