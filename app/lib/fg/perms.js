import { html } from '../../vendor/lit-element/lit-element'
import { shorten } from '../strings'

export const PERM_ICONS = {
  js: 'fas fa-code',
  network: 'fas fa-cloud',
  createDat: 'fas fa-folder-open',
  modifyDat: 'fas fa-folder-open',
  deleteDat: 'fas fa-folder-open',
  media: 'fas fa-video',
  geolocation: 'fas fa-map-marked',
  notifications: 'fas fa-bell',
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
  dangerousAppControl: 'fas flask',
}

export function renderPermDesc ({bg, url, permId, permParam, permOpts}) {
  const api = bg.shellMenus || bg.permPrompt
  const openUrl = url => e => {
    e.preventDefault()
    e.stopPropagation()
    api.createTab(url)
  }
  switch (permId) {
    case 'js': return 'Run Javascript'
    case 'media': return 'Use your camera and microphone'
    case 'geolocation': return 'Know your location'
    case 'notifications': return 'Create desktop notifications'
    case 'midiSysex': return 'Access your MIDI devices'
    case 'pointerLock': return 'Lock your cursor'
    case 'fullscreen': return 'Go fullscreen'
    case 'openExternal': return `Open this URL in another program: ${shorten(url, 128)}`
    case 'experimentalLibrary': return 'Read and modify your Library'
    case 'experimentalDatPeers': return 'Send and receive messages with peers'
    case 'dangerousAppControl': return 'Read and write your data, including bookmarks, archives, and files'

    case 'network':
      if (permParam === '*') return 'Access the network freely'
      return 'contact ' + permParam

    case 'download':
      return html`<span>Download ${permOpts.filename}</span>`

    case 'createDat':
      if (permOpts.title) return `Create a new Dat archive, "${permOpts.title}"`
      return 'Create a new Dat archive'

    case 'modifyDat':
      {
        let viewArchive = openUrl('beaker://library/' + permParam)
        return html`<span>Write files to <a @click=${viewArchive}>${permOpts.title}</a></span>`
      }

    case 'deleteDat':
      {
        let viewArchive = openUrl('beaker://library/' + permParam)
        return html`<span>Delete the archive <a @click=${viewArchive}>${permOpts.title}</a></span>`
      }

    case 'experimentalLibraryRequestAdd':
      {
        let viewArchive = openUrl('beaker://library/' + permParam)
        return html`<span>Seed <a @click=${viewArchive}>${permOpts.title}</a></span>`
      }

    case 'experimentalLibraryRequestRemove':
      {
        let viewArchive = openUrl('beaker://library/' + permParam)
        return html`<span>Stop seeding <a @click=${viewArchive}>${permOpts.title}</a></span>`
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