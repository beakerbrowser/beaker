import emitStream from 'emit-stream'
import * as pages from '../pages'

// exported api
// =

export function setup () {
  // wire up events
  var archivesEvents = emitStream(datInternalAPI.archivesEventStream())
  archivesEvents.on('update-listing', onUpdateListing)
}

// event handlers
// =

function onUpdateListing ({ key }) {
  // find all pages that are 1) live reloading, and 2) on this archive
  pages.getAll().forEach(page => {
    if (page.isLiveReloading && isViewingArchive(page, key)) {
      page.triggerLiveReload(key)
    }
  })
}

function isViewingArchive (page, archiveKey) {
  return page.getIntendedURL().startsWith('dat://' + archiveKey)
}
