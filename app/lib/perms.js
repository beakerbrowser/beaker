/* globals DatArchive */

export default {
  js: {
    persist: true,
    idempotent: true,
    alwaysDisallow: false,
    requiresRefresh: true,
    experimental: false
  },
  network: {
    persist: true,
    idempotent: true,
    alwaysDisallow: false,
    requiresRefresh: true,
    experimental: false
  },
  createDat: {
    persist: false,
    idempotent: false,
    alwaysDisallow: false,
    requiresRefresh: false,
    experimental: false
  },
  modifyDat: {
    persist: 'allow', // dont persist 'deny'
    idempotent: true,
    alwaysDisallow: false,
    requiresRefresh: false,
    experimental: false
  },
  deleteDat: {
    persist: false,
    idempotent: false,
    alwaysDisallow: false,
    requiresRefresh: false,
    experimental: false
  },
  media: {
    persist: true,
    idempotent: true,
    alwaysDisallow: false,
    requiresRefresh: false,
    experimental: false
  },
  geolocation: {
    persist: false,
    idempotent: true,
    alwaysDisallow: true, // NOTE geolocation is disabled, right now
    requiresRefresh: false,
    experimental: false
  },
  notifications: {
    persist: true,
    idempotent: true,
    alwaysDisallow: false,
    requiresRefresh: false,
    experimental: false
  },
  midiSysex: {
    persist: false,
    idempotent: true,
    alwaysDisallow: false,
    requiresRefresh: false,
    experimental: false
  },
  pointerLock: {
    persist: false,
    idempotent: true,
    alwaysDisallow: false,
    requiresRefresh: false,
    experimental: false
  },
  fullscreen: {
    persist: true,
    idempotent: false,
    alwaysAllow: false,
    alwaysDisallow: false,
    requiresRefresh: false,
    experimental: false
  },
  download: {
    persist: false,
    idempotent: false,
    alwaysDisallow: false,
    requiresRefresh: false,
    experimental: false
  },
  dangerousAppControl: {
    persist: true,
    idempotent: false,
    alwaysAllow: false,
    requiresRefresh: false,
    experimental: false
  },
  openExternal: {
    persist: false,
    idempotent: false,
    alwaysDisallow: false,
    requiresRefresh: false,
    experimental: false
  },
  experimentalLibrary: {
    persist: true,
    idempotent: true,
    alwaysDisallow: false,
    requiresRefresh: false,
    experimental: true
  },
  experimentalLibraryRequestAdd: {
    persist: false,
    idempotent: false,
    alwaysDisallow: false,
    requiresRefresh: false,
    experimental: true
  },
  experimentalLibraryRequestRemove: {
    persist: false,
    idempotent: false,
    alwaysDisallow: false,
    requiresRefresh: false,
    experimental: true
  },
  experimentalGlobalFetch: {
    persist: true,
    idempotent: true,
    alwaysDisallow: false,
    requiresRefresh: false,
    experimental: true
  },
  experimentalDatPeers: {
    persist: true,
    idempotent: true,
    alwaysAllow: true,
    alwaysDisallow: false,
    requiresRefresh: false,
    experimental: true
  },
  experimentalCapturePage: {
    persist: false,
    idempotent: false,
    alwaysDisallow: false,
    requiresRefresh: false,
    experimental: true
  }
}
