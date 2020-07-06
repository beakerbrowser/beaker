import {URL} from 'url'
import * as tabManager from '../tabs/manager'
import * as sitedataDb from '../../dbs/sitedata'
import * as settingsDb from '../../dbs/settings'

const ZOOM_STEP = 0.5

// exported api
// =

export async function setZoomFromSitedata (view, origin) {
  if (view.panes) view = view.activePane

  // load zoom from sitedata
  origin = origin || view.origin
  if (!origin) return

  var v = await sitedataDb.get(origin, 'zoom')
  view.zoom = +v || (await settingsDb.get('default_zoom'))
  view.emitUpdateState()
  view.webContents.setZoomLevel(view.zoom)
}

export function setZoom (view, z) {
  if (view.panes) view = view.activePane

  // clamp
  if (z > 4.5) z = 4.5
  if (z < -3) z = -3

  // update
  view.zoom = z
  view.webContents.setZoomLevel(view.zoom)
  view.emitUpdateState()

  // persist to sitedata
  var origin = view.origin
  if (!origin) return
  sitedataDb.set(view.url, 'zoom', view.zoom)

  // update all pages at the origin
  tabManager.getAll(view.browserWindow).forEach(v => {
    if (v !== view && v.origin === origin) {
      v.zoom = z
    }
  })
}

export function zoomIn (view) {
  if (view.panes) view = view.activePane
  setZoom(view, view.zoom + ZOOM_STEP)
}

export function zoomOut (view) {
  if (view.panes) view = view.activePane
  setZoom(view, view.zoom - ZOOM_STEP)
}

export function zoomReset (view) {
  if (view.panes) view = view.activePane
  setZoom(view, 0)
}