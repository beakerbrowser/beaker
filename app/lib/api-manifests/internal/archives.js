export default {
  // system state
  status: 'promise',

  // local cache management and querying
  add: 'promise',
  remove: 'promise',
  bulkRemove: 'promise',
  list: 'promise',

  // publishing
  publish: 'promise',
  unpublish: 'promise',
  listPublished: 'promise',
  countPublished: 'promise',
  getPublishRecord: 'promise',

  // internal management
  clearFileCache: 'promise',
  clearDnsCache: 'promise',

  // events
  createEventStream: 'readable',
  createDebugStream: 'readable'
}
