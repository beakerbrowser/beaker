import {URL} from 'url'
import * as beakerCore from '@beaker/core'
import * as viewManager from '../view-manager'
const sitedataDb = beakerCore.dbs.sitedata

const ZOOM_STEP = 0.5

// exported api
// =

export async function setZoomFromSitedata (view, origin) {
  // load zoom from sitedata
  origin = origin || toOrigin(view.url)
  if (!origin) return

  var v = await sitedataDb.get(origin, 'zoom')
  view.zoom = +v || 0
  view.emitUpdateState()
  view.webContents.setZoomLevel(view.zoom)
}

export function setZoom (view, z) {
  // clamp
  if (z > 4.5) z = 4.5
  if (z < -3) z = -3

  // update
  view.zoom = z
  view.webContents.setZoomLevel(view.zoom)
  view.emitUpdateState()

  // persist to sitedata
  var origin = toOrigin(view.url)
  if (!origin) return
  sitedataDb.set(view.url, 'zoom', view.zoom)

  // update all pages at the origin
  viewManager.getAll(view.browserWindow).forEach(v => {
    if (v !== view && toOrigin(v.url) === origin) {
      v.zoom = z
    }
  })
}

export function zoomIn (view) {
  setZoom(view, view.zoom + ZOOM_STEP)
}

export function zoomOut (view) {
  setZoom(view, view.zoom - ZOOM_STEP)
}

export function zoomReset (view) {
  setZoom(view, 0)
}

// internal methods
// =

function toOrigin (str) {
  try {
    var u = (new URL(str))
    return u.protocol + '//' + u.hostname
  } catch (e) { return '' }
}