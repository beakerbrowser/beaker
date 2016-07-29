import * as yo from 'yo-yo'
import speedometer from 'speedometer'
import prettyBytes from 'pretty-bytes'
import { throttle } from '../../lib/functions'

const RERENDER_INTERVAL = 500 // .5s
const RERENDER_THROTTLE = 500 // .5s

// NOTE
// this does not clean up CBs until the page is destroyed!
export default function Stats (emitter, { peers }) {
  if (!(this instanceof Stats)) return new Stats(emitter)

  // stat state
  this.peers = peers || 0
  this.uploadSpeed = speedometer()
  this.downloadSpeed = speedometer()

  // wire up events
  emitter.on('update-peers', this.onUpdatePeers.bind(this))
  // emitter.on('update-blocks') TODO needed?
  emitter.on('download', this.onDownload.bind(this))
  emitter.on('upload', this.onUpload.bind(this))

  // setup periodic render
  // (if this wasnt done, the transfer rates would never drop to 0)
  setInterval(() => {
    this.updateActives()
  }, RERENDER_INTERVAL)
}

Stats.prototype.render = function () {
  var us = prettyBytes(this.uploadSpeed()) + '/s'
  var ds = prettyBytes(this.downloadSpeed()) + '/s'
  return yo`<div class="hypercore-stats">
    <span class="hs-peers">Sharing with ${this.peers} peers</span>
    <span class="download-speed"><span class="icon icon-down"></span> ${ds}</span>
    <span class="upload-speed"><span class="icon icon-up"></span> ${us}</span>
  </div>`
}

Stats.prototype.updateActives = throttle(function () {
  // render all active widgets
  Array.from(document.querySelectorAll('.hypercore-stats')).forEach(el => yo.update(el, this.render()))
}, RERENDER_THROTTLE)

Stats.prototype.onUpdatePeers = function ({ key, peers }) {
  this.peers = peers
  this.updateActives()
}

Stats.prototype.onDownload = function ({ key, index, bytes }) {
  this.downloadSpeed(bytes)
  this.updateActives()
}

Stats.prototype.onUpload = function ({ key, index, bytes }) {
  this.uploadSpeed(bytes)
  this.updateActives()
}