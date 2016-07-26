import bitfield from './bitfield'

// helper function to wire up all archive events to the given emitter
export default function (emitter, archive) {
  var key = archive.key.toString('hex')

  // initialize all trackers
  track(archive.metadata, 'metadata')
  archive.metadata.on('peer-add', () => emitter.emit('update-peers', { key, peers: archive.metadata.peers.length }))
  archive.metadata.on('peer-remove', () => emitter.emit('update-peers', { key, peers: archive.metadata.peers.length }))
  archive.open(() => track(archive.content, 'content'))
  function track (feed, name) {
    // feed.on('update', () => emitter.emit('update-blocks', { key, name, blocks: bitfield(feed), bytes: feed.bytes }))
    feed.on('download', (index, data) => emitter.emit('download', { key, name, index: index, bytes: data.length}))
    feed.on('upload', (index, data) => emitter.emit('upload', { key, name, index: index, bytes: data.length}))
  }
}