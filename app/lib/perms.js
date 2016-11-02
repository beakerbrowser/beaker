export default {
  js: {
    desc: 'Run Javascript',
    icon: 'code',
    persist: true,
    alwaysDisallow: false
  },
  network: {
    desc: 'Access the network to contact ',
    icon: 'cloud',
    persist: true,
    alwaysDisallow: false
  },
  media: {
    desc: 'Use your camera and microphone',
    icon: 'mic',
    persist: true,
    alwaysDisallow: false
  },
  geolocation: {
    desc: 'Know your location',
    icon: '',
    persist: false,
    alwaysDisallow: true // NOTE geolocation is disabled, right now
  },
  notifications: {
    desc: 'Create desktop notifications',
    icon: 'comment',
    persist: true,
    alwaysDisallow: false
  },
  midiSysex: {
    desc: 'Access your MIDI devices',
    icon: 'sound',
    persist: false,
    alwaysDisallow: false
  },
  pointerLock: {
    desc: 'Lock your cursor',
    icon: 'mouse',
    persist: false,
    alwaysDisallow: false
  },
  fullscreen: {
    desc: 'Go fullscreen',
    icon: 'resize-full',
    persist: false,
    alwaysDisallow: false
  },
  openExternal: {
    desc: 'Open this URL in another program: ',
    icon: '',
    persist: false,
    alwaysDisallow: false
  }
}