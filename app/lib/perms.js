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
  var el = yo`<span class="link">${prettyHash(archiveKey)}</span>`
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
    idempotent: true,
    alwaysDisallow: false,
    requiresRefresh: true,
    experimental: false
  },
  network: {
    desc: param => {
      if (param === '*') return 'Access the network freely'
      return 'contact ' + param
    },
    icon: 'cloud',
    persist: true,
    idempotent: true,
    alwaysDisallow: false,
    requiresRefresh: true,
    experimental: false
  },
  createDat: {
    desc: (param, pages, opts = {}) => {
      if (opts && opts.title) return `Create a new Dat archive, "${opts.title}"`
      return 'Create a new Dat archive'
    },
    icon: 'folder',
    persist: false,
    idempotent: false,
    alwaysDisallow: false,
    requiresRefresh: false,
    experimental: false
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
    idempotent: true,
    alwaysDisallow: false,
    requiresRefresh: false,
    experimental: false
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
    idempotent: false,
    alwaysDisallow: false,
    requiresRefresh: false,
    experimental: false
  },
  media: {
    desc: 'Use your camera and microphone',
    icon: 'video-camera',
    persist: true,
    idempotent: true,
    alwaysDisallow: false,
    requiresRefresh: false,
    experimental: false
  },
  geolocation: {
    desc: 'Know your location',
    icon: 'map-marker',
    persist: false,
    idempotent: true,
    alwaysDisallow: true, // NOTE geolocation is disabled, right now
    requiresRefresh: false,
    experimental: false
  },
  notifications: {
    desc: 'Create desktop notifications',
    icon: 'bell',
    persist: true,
    idempotent: true,
    alwaysDisallow: false,
    requiresRefresh: false,
    experimental: false
  },
  midiSysex: {
    desc: 'Access your MIDI devices',
    icon: 'headphones',
    persist: false,
    idempotent: true,
    alwaysDisallow: false,
    requiresRefresh: false,
    experimental: false
  },
  pointerLock: {
    desc: 'Lock your cursor',
    icon: 'mouse-pointer',
    persist: false,
    idempotent: true,
    alwaysDisallow: false,
    requiresRefresh: false,
    experimental: false
  },
  fullscreen: {
    desc: 'Go fullscreen',
    icon: 'arrows-alt',
    persist: true,
    idempotent: false,
    alwaysAllow: true,
    requiresRefresh: false,
    experimental: false
  },
  download: {
    desc: (param, pages, opts = {}) => {
      return yo`<span>Download ${opts.filename}</span>`
    },
    icon: 'download',
    persist: false,
    idempotent: false,
    alwaysDisallow: false,
    requiresRefresh: false,
    experimental: false
  },
  dangerousAppControl: {
    desc: 'Read and write your data, including bookmarks, archives, and files',
    icon: 'flask',
    persist: true,
    idempotent: false,
    alwaysAllow: false,
    requiresRefresh: false,
    experimental: false
  },
  openExternal: {
    desc: 'Open this URL in another program: ',
    icon: 'external-link-alt',
    persist: false,
    idempotent: false,
    alwaysDisallow: false,
    requiresRefresh: false,
    experimental: false
  },
  experimentalLibrary: {
    desc: 'Read and modify your Library',
    icon: 'book',
    persist: true,
    idempotent: true,
    alwaysDisallow: false,
    requiresRefresh: false,
    experimental: true
  },
  experimentalLibraryRequestAdd: {
    desc: (param, pages, opts = {}) => {
      const title = lazyDatTitleElement(param)
      const viewArchive = () => pages.setActive(pages.create('beaker://library/' + param))
      return yo`<span>Seed <a onclick=${viewArchive}>${title}</a></span>`
    },
    icon: 'upload',
    persist: false,
    idempotent: false,
    alwaysDisallow: false,
    requiresRefresh: false,
    experimental: true
  },
  experimentalLibraryRequestRemove: {
    desc: (param, pages, opts = {}) => {
      const title = lazyDatTitleElement(param)
      const viewArchive = () => pages.setActive(pages.create('beaker://library/' + param))
      return yo`<span>Stop seeding <a onclick=${viewArchive}>${title}</a></span>`
    },
    icon: 'times',
    persist: false,
    idempotent: false,
    alwaysDisallow: false,
    requiresRefresh: false,
    experimental: true
  },
  experimentalGlobalFetch: {
    desc: (param, pages, opts = {}) => {
      const viewPage = () => pages.setActive(pages.create(param))
      return yo`<span>Fetch data from <a onclick=${viewPage}>${param}</a></span>`
    },
    icon: 'download',
    persist: true,
    idempotent: true,
    alwaysDisallow: false,
    requiresRefresh: false,
    experimental: true
  },
  experimentalDatPeers: {
    desc: 'Send and receive messages with peers',
    icon: 'exchange',
    persist: true,
    idempotent: true,
    alwaysAllow: true,
    alwaysDisallow: false,
    requiresRefresh: false,
    experimental: true
  },
  experimentalCapturePage: {
    desc: (param, pages, opts = {}) => {
      const viewPage = () => pages.setActive(pages.create(param))
      return yo`<span>Take a screenshot of <a onclick=${viewPage}>${param}</a></span>`
    },
    icon: 'camera',
    persist: false,
    idempotent: false,
    alwaysDisallow: false,
    requiresRefresh: false,
    experimental: true
  }
}
