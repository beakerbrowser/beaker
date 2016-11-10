export default {
  js: {
    desc: 'Run Javascript',
    icon: 'code',
    persist: true,
    alwaysDisallow: false
  },
  network: {
    desc: (param) => {
      if (param === '*') return 'access the network freely'
      return 'contact ' + param
    },
    icon: 'cloud',
    persist: true,
    alwaysDisallow: false
  },
  media: {
    desc: 'use your camera and microphone',
    icon: 'mic',
    persist: true,
    alwaysDisallow: false
  },
  geolocation: {
    desc: 'know your location',
    icon: '',
    persist: false,
    alwaysDisallow: true // NOTE geolocation is disabled, right now
  },
  notifications: {
    desc: 'create desktop notifications',
    icon: 'comment',
    persist: true,
    alwaysDisallow: false
  },
  midiSysex: {
    desc: 'access your MIDI devices',
    icon: 'sound',
    persist: false,
    alwaysDisallow: false
  },
  pointerLock: {
    desc: 'lock your cursor',
    icon: 'mouse',
    persist: false,
    alwaysDisallow: false
  },
  fullscreen: {
    desc: 'go fullscreen',
    icon: 'resize-full',
    persist: false,
    alwaysDisallow: false
  },
  openExternal: {
    desc: 'open this URL in another program: ',
    icon: '',
    persist: false,
    alwaysDisallow: false
  }
}