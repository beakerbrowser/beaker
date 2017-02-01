export default {
  queryArchives: 'promise',
  getArchiveDetails: 'promise',
  getArchiveStats: 'promise',

  resolveName: 'async',

  createNewArchive: 'promise',
  forkArchive: 'promise',
  setArchiveUserSettings: 'promise',
  updateArchiveManifest: 'promise',

  writeArchiveFileFromData: 'promise',
  writeArchiveFileFromPath: 'promise',
  exportFileFromArchive: 'promise',

  swarm: 'sync',
  unswarm: 'sync',
  downloadArchiveEntry: 'promise',
  openInExplorer: 'sync',
  archivesEventStream: 'readable',

  getGlobalSetting: 'promise',
  setGlobalSetting: 'promise'
}
