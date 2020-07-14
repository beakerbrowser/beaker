const isDriveRegex = /^[a-z0-9]{64}/i

export const PERMS = {
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
  createDrive: {
    persist: false,
    idempotent: false,
    alwaysDisallow: false,
    requiresRefresh: false,
    experimental: false
  },
  modifyDrive: {
    persist: 'allow', // dont persist 'deny'
    idempotent: true,
    alwaysDisallow: false,
    requiresRefresh: false,
    experimental: false
  },
  deleteDrive: {
    persist: false,
    idempotent: false,
    alwaysDisallow: false,
    requiresRefresh: false,
    experimental: false
  },
  media: {
    persist: false,
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
  midi: {
    persist: false,
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
  },
  contactsList: {
    persist: 'allow', // dont persist 'deny'
    idempotent: true,
    alwaysDisallow: false,
    requiresRefresh: false,
    experimental: false
  },
  panesCreate: {
    persist: 'allow', // dont persist 'deny'
    idempotent: true,
    alwaysDisallow: false,
    requiresRefresh: false,
    dangerous: true
  },
  panesAttach: {
    persist: 'allow', // dont persist 'deny'
    idempotent: true,
    alwaysDisallow: false,
    requiresRefresh: false,
    dangerous: true
  },
  panesInject: {
    persist: 'allow', // dont persist 'deny'
    idempotent: true,
    alwaysDisallow: false,
    requiresRefresh: false,
    dangerous: true
  },
}

export const PERM_ICONS = {
  js: 'fas fa-code',
  network: 'fas fa-cloud',
  createDrive: 'fas fa-folder-open',
  modifyDrive: 'fas fa-folder-open',
  deleteDrive: 'fas fa-folder-open',
  media: 'fas fa-video',
  geolocation: 'fas fa-map-marked',
  notifications: 'fas fa-bell',
  midi: 'fas fa-headphones',
  midiSysex: 'fas fa-headphones',
  pointerLock: 'fas fa-mouse-pointer',
  fullscreen: 'fas fa-arrows-alt',
  download: 'fas fa-download',
  openExternal: 'fas fa-external-link-alt',
  experimentalLibrary: 'fas fa-book',
  experimentalLibraryRequestAdd: 'fas fa-upload',
  experimentalLibraryRequestRemove: 'fas fa-times',
  experimentalGlobalFetch: 'fas fa-download',
  experimentalDatPeers: 'fas fa-exchange-alt',
  experimentalCapturePage: 'fas fa-camera',
  dangerousAppControl: 'fas fa-flask',
  contactsList: 'fas fa-user-friends',
  panesCreate: 'fas fa-columns',
  panesAttach: 'fas fa-columns',
  panesInject: 'fas fa-columns'
}

export function renderPermDesc ({html, bg, url, permId, permParam, permOpts}) {
  const api = bg ? (bg.shellMenus || bg.permPrompt) : null
  const openUrl = url => e => {
    e.preventDefault()
    e.stopPropagation()
    url = isDriveRegex.test(url) ? `hyper://${url}/` : url
    if (api) api.createTab(url)
    else beaker.browser.openUrl(url, {setActive: true})
  }
  const mediaTypeToTool = v => ({video: 'camera', audio: 'microphone'})[v]
  switch (permId) {
    case 'js': return 'Run Javascript'
    case 'media': return `Use your ${(permOpts.mediaTypes || ['video', 'audio']).map(mediaTypeToTool).join(' and ')}`
    case 'geolocation': return 'Know your location'
    case 'notifications': return 'Create desktop notifications'
    case 'midi': return 'Access your MIDI devices'
    case 'midiSysex': return 'Access your MIDI devices'
    case 'pointerLock': return 'Lock your cursor'
    case 'fullscreen': return 'Go fullscreen'
    case 'openExternal': return `Open this URL in another program: ${shorten(permOpts.externalURL, 128)}`
    case 'experimentalLibrary': return 'Read and modify your Library'
    case 'experimentalDatPeers': return 'Send and receive messages with peers'
    case 'dangerousAppControl': return 'Read and write your data, including bookmarks, archives, and files'
    case 'contactsList': return 'Read your address-book in Beaker'
    case 'panesCreate': return 'Open a page in a new pane'
    case 'panesAttach': return 'Attach to other open pages and navigate them'
    case 'panesInject': return 'Inject code into other open pages'

    case 'network':
      if (permParam === '*') return 'Access the network freely'
      return 'contact ' + permParam

    case 'download':
      return html`<span>Download ${permOpts.filename}</span>`

    case 'createDrive':
      if (permOpts.title) return `Create a new Hyperdrive, "${permOpts.title}"`
      return 'Create a new Hyperdrive'

    case 'modifyDrive':
      {
        let viewArchive = openUrl(permParam)
        return html`<span>Write files to <a @click=${viewArchive}>${permOpts.title}</a></span>`
      }

    case 'deleteDrive':
      {
        let viewArchive = openUrl(permParam)
        return html`<span>Delete the archive <a @click=${viewArchive}>${permOpts.title}</a></span>`
      }

    case 'experimentalLibraryRequestAdd':
      {
        let viewArchive = openUrl(permParam)
        return html`<span>Host <a @click=${viewArchive}>${permOpts.title}</a></span>`
      }

    case 'experimentalLibraryRequestRemove':
      {
        let viewArchive = openUrl(permParam)
        return html`<span>Stop hosting <a @click=${viewArchive}>${permOpts.title}</a></span>`
      }

    case 'experimentalGlobalFetch':
      {
        let viewPage = openUrl(permParam)
        return html`<span>Fetch data from <a @click=${viewPage}>${permParam}</a></span>`
      }

    case 'experimentalCapturePage':
      {
        let viewPage = openUrl(permParam)
        return html`<span>Take a screenshot of <a @click=${viewPage}>${permParam}</a></span>`
      }
  }
}

export function getPermId (permissionToken) {
  return permissionToken.split(':')[0]
}

export function getPermParam (permissionToken) {
  return permissionToken.split(':').slice(1).join(':')
}

function shorten (str, n = 6) {
  if (str.length > (n + 3)) {
    return str.slice(0, n) + '...'
  }
  return str
}