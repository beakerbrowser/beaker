export default {
  createEventsStream: 'readable',
  getInfo: 'promise',
  getDaemonStatus: 'promise',
  getDaemonNetworkStatus: 'promise',
  checkForUpdates: 'promise',
  restartBrowser: 'sync',

  getSettings: 'promise',
  getSetting: 'promise',
  setSetting: 'promise',
  updateAdblocker: 'promise',
  updateSetupState: 'promise',
  migrate08to09: 'promise',
  setStartPageBackgroundImage: 'promise',
  
  getDefaultProtocolSettings: 'promise',
  setAsDefaultProtocolClient: 'promise',
  removeAsDefaultProtocolClient: 'promise',

  listBuiltinFavicons: 'promise',
  getBuiltinFavicon: 'promise',
  uploadFavicon: 'promise',
  imageToIco: 'promise',

  reconnectHyperdriveDaemon: 'promise',

  fetchBody: 'promise',
  downloadURL: 'promise',

  convertDat: 'promise',

  getResourceContentType: 'sync',
  getCertificate: 'promise',

  executeShellWindowCommand: 'promise',
  toggleSiteInfo: 'promise',
  toggleLiveReloading: 'promise',
  setWindowDimensions: 'promise',
  setWindowDragModeEnabled: 'promise',
  moveWindow: 'promise',
  maximizeWindow: 'promise',
  toggleWindowMaximized: 'promise',
  minimizeWindow: 'promise',
  closeWindow: 'promise',
  resizeSiteInfo: 'promise',
  refreshTabState: 'promise',

  spawnAndExecuteJs: 'promise',

  showOpenDialog: 'promise',
  showContextMenu: 'promise',
  showModal: 'promise',
  newWindow: 'promise',
  newPane: 'promise',
  openUrl: 'promise',
  gotoUrl: 'promise',
  getPageUrl: 'promise',
  refreshPage: 'promise',
  focusPage: 'promise',
  executeJavaScriptInPage: 'promise',
  injectCssInPage: 'promise',
  uninjectCssInPage: 'promise',
  openFolder: 'promise',
  doWebcontentsCmd: 'promise',
  doTest: 'promise',
  closeModal: 'sync'
}
