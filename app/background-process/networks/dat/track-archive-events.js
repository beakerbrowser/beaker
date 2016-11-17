var debug = require('debug')('dat')

// helper function to wire up all archive events to the given emitter
export default function trackArchiveEvents (emitter, archive) {
  var key = archive.key.toString('hex')

  // initialize all trackers
  track(archive.metadata, 'metadata')
  archive.metadata.on('peer-add', () => emitter.emit('update-peers', { key, peers: archive.metadata.peers.length }))
  archive.metadata.on('peer-remove', () => emitter.emit('update-peers', { key, peers: archive.metadata.peers.length }))
  archive.open(err => {
    if (err) return console.error('Error opening archive', key, err)
    track(archive.content, 'content')
    if (archive.metadata) {
      archive.metadata.on('download-finished', () => {
        debug('Metadata download finished', key)
        emitter.emit('update-listing', { key })
        archive.pullLatestArchiveMeta()
      })
    }
  })
  function track (feed, name, err) {
    if (feed) {
      // feed.on('update', () => emitter.emit('update-blocks', { key, feed: name, bitfield: feed.bitfield.buffer }))
      feed.on('download', (index, data) => emitter.emit('download', { key, feed: name, index, bytes: data.length }))
      feed.on('upload', (index, data) => emitter.emit('upload', { key, feed: name, index, bytes: data.length }))
    }
  }
}
