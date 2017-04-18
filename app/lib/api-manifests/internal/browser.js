export default {
  eventsStream: 'readable',
  getInfo: 'promise',
  checkForUpdates: 'promise',
  restartBrowser: 'sync',

  isIPFSDaemonActive: 'sync',

  getSettings: 'promise',
  getSetting: 'promise',
  setSetting: 'promise',

  getUserSetupStatus: 'promise',
  setUserSetupStatus: 'promise',

  getDefaultProtocolSettings: 'promise',
  setAsDefaultProtocolClient: 'promise',
  removeAsDefaultProtocolClient: 'promise',

  setStartPageBackgroundImage: 'promise',

  showOpenDialog: 'promise',
  openUrl: 'sync',

  closeModal: 'sync'
}
