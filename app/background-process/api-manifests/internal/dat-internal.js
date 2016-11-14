export default {
  queryArchives: 'promise',
  getArchiveDetails: 'promise',
  getArchiveStats: 'promise',

  resolveName: 'async',

  createNewArchive: 'promise',
  forkArchive: 'promise',
  updateArchiveManifest: 'promise',
  updateArchiveClaims: 'promise',
  writeArchiveFileFromPath: 'promise',

  swarm: 'sync',
  unswarm: 'sync',
  downloadArchiveEntry: 'promise',
  openInExplorer: 'sync',
  archivesEventStream: 'readable',

  getGlobalSetting: 'promise',
  setGlobalSetting: 'promise'
}
