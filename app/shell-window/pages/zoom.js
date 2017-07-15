/* globals beakerSitedata */

import {getAll as getAllPages} from '../pages'
import * as navbar from '../ui/navbar'

const ZOOM_STEP = 0.5

export function setZoomFromSitedata (page, origin) {
  // load zoom from sitedata
  origin = origin || page.getURLOrigin()
  if (!origin) { return }
  beakerSitedata.get(origin, 'zoom').then(v => {
    if (typeof v != 'undefined') {
      page.zoom = +v
      navbar.update(page)
      page.setZoomLevelAsync(page.zoom)
    }
  })
}

export function setZoom (page, z) {
  // clamp
  if (z > 4.5) z = 4.5
  if (z < -3) z = -3

  // update
  page.zoom = z
  page.setZoomLevelAsync(page.zoom)
  navbar.update(page)

  // persist to sitedata
  var origin = page.getURLOrigin()
  if (!origin) { return }
  beakerSitedata.set(origin, 'zoom', page.zoom)

  // update all pages at the origin
  getAllPages().forEach(p => {
    if (p !== page && p.getURLOrigin() === origin) {
      p.zoom = z
    }
  })
}

export function zoomIn (page) {
  setZoom(page, page.zoom + ZOOM_STEP)
}

export function zoomOut (page) {
  setZoom(page, page.zoom - ZOOM_STEP)
}

export function zoomReset (page) {
  setZoom(page, 0)
}
