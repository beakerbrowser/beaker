import { webFrame } from 'electron'
import * as sitedata from './sitedata'

const ZOOM_STEP = 0.5

// globals
// =

var zoom = 0

// exported api
// =

export function setup () {
  // load zoom from sitedata
  sitedata.get('zoom', (err, v) => {
    if (typeof v != 'undefined') {
      zoom = +v
      webFrame.setZoomLevel(zoom)
    }
  })
}

export function setZoom(z) {
  zoom = z
  webFrame.setZoomLevel(zoom)

  // persist to sitedata
  sitedata.set('zoom', zoom)
}

export function zoomIn () {
  setZoom(zoom + ZOOM_STEP)
}

export function zoomOut () {
  setZoom(zoom - ZOOM_STEP)
}

export function zoomReset () {
  setZoom(0)
}