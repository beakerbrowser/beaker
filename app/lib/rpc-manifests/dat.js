export default {
  archives: 'async',
  ownedArchives: 'async',
  subscribedArchives: 'async',
  
  archiveInfo: 'async',
  openInExplorer: 'async',

  createNewArchive: 'async',
  clone: 'async',
  subscribe: 'async',
  createFileWriteStream: 'writable',
  
  archivesEventStream: 'readable',

  swarm: 'sync',
  unswarm: 'sync'
}