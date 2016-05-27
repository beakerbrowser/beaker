import { webFrame } from 'electron'

const ZOOM_STEP = 0.5

// TODO persistent zoom
var zoom = 0
export function setZoom(z) {
  zoom = z
  webFrame.setZoomLevel(zoom)
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