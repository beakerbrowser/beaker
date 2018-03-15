/* globals DatArchive */

import prettyHash from 'pretty-hash'

// front-end only:
var yo
if (typeof document !== 'undefined') {
  yo = require('yo-yo')
}

// HACK
// this is the best way I could figure out for pulling in the dat title, given the current perms flow
// not ideal but it works
// (note the in memory caching)
// -prf
var datTitleMap = {}
function lazyDatTitleElement (archiveKey, title) {
  // if we have the title, render now
  if (title) return title
  if (archiveKey in datTitleMap) return datTitleMap[archiveKey] // pull from cache

  // no title, we need to look it up. render now, then update
  var el = yo`<span>${prettyHash(archiveKey)}</span>`
  el.id = 'lazy-' + archiveKey
  ;(new DatArchive(archiveKey)).getInfo().then(details => {
    datTitleMap[archiveKey] = details.title // cache
    el.textContent = details.title // render
  })
  return el
}

export default {
  js: {
    desc: 'Run Javascript',
    icon: 'code',
    persist: true,
    alwaysDisallow: false,
    requiresRefresh: true
  },
  network: {
    desc: param => {
      if (param === '*') return 'Access the network freely'
      return 'contact ' + param
    },
    icon: 'cloud',
    persist: true,
    alwaysDisallow: false,
    requiresRefresh: true
  },
  createDat: {
    desc: (param, pages, opts = {}) => {
      if (opts && opts.title) return `Create a new Dat archive, "${opts.title}"`
      return 'Create a new Dat archive'
    },
    icon: 'folder',
    persist: false,
    alwaysDisallow: false,
    requiresRefresh: false
  },
  modifyDat: {
    desc: (param, pages, opts = {}) => {
      const firstWord = opts.capitalize ? 'Write' : 'write'
      const title = lazyDatTitleElement(param, opts.title)
      const viewArchive = () => pages.setActive(pages.create('beaker://library/' + param))
      return yo`<span>${firstWord} files to <a onclick=${viewArchive}>${title}</a></span>`
    },
    icon: 'folder',
    persist: 'allow', // dont persist 'deny'
    alwaysDisallow: false,
    requiresRefresh: false
  },
  deleteDat: {
    desc: (param, pages, opts = {}) => {
      const firstWord = opts.capitalize ? 'Delete' : 'delete'
      const title = lazyDatTitleElement(param, opts.title)
      const viewArchive = () => pages.setActive(pages.create('beaker://library/' + param))
      return yo`<span>${firstWord} the archive <a onclick=${viewArchive}>${title}</a></span>`
    },
    icon: 'folder',
    persist: false,
    alwaysDisallow: false,
    requiresRefresh: false
  },
  media: {
    desc: 'Use your camera and microphone',
    icon: 'video-camera',
    persist: true,
    alwaysDisallow: false,
    requiresRefresh: false
  },
  geolocation: {
    desc: 'Know your location',
    icon: 'map-marker',
    persist: false,
    alwaysDisallow: true, // NOTE geolocation is disabled, right now
    requiresRefresh: false
  },
  notifications: {
    desc: 'Create desktop notifications',
    icon: 'bell',
    persist: true,
    alwaysDisallow: false,
    requiresRefresh: false
  },
  midiSysex: {
    desc: 'Access your MIDI devices',
    icon: 'headphones',
    persist: false,
    alwaysDisallow: false,
    requiresRefresh: false
  },
  pointerLock: {
    desc: 'Lock your cursor',
    icon: 'mouse-pointer',
    persist: false,
    alwaysDisallow: false,
    requiresRefresh: false
  },
  fullscreen: {
    desc: 'Go fullscreen',
    icon: 'arrows-alt',
    persist: true,
    alwaysAllow: true,
    requiresRefresh: false
  },
  openExternal: {
    desc: 'Open this URL in another program: ',
    icon: 'external-link',
    persist: false,
    alwaysDisallow: false,
    requiresRefresh: false
  }
}
