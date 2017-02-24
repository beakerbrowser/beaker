export default {
  createArchive: 'sync',
  forkArchive: 'sync',

  getInfo: 'promise',
  setInfo: 'promise',

  stat: 'promise',
  readFile: 'promise',
  writeFile: 'promise',
  deleteFile: 'promise',
  download: 'promise',

  listFiles: 'promise',
  createDirectory: 'promise',
  deleteDirectory: 'promise',

  createFileActivityStream: 'readable',
  createNetworkActivityStream: 'readable',

  importFromFilesystem: 'promise',
  exportToFilesystem: 'promise',
  exportToArchive: 'promise'
}
