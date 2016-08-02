import bitfield from './bitfield'
import log from '../../../log'

// helper function to wire up all archive events to the given emitter
export default function (emitter, archive) {
  var key = archive.key.toString('hex')

  // initialize all trackers
  track(archive.metadata, 'metadata')
  archive.metadata.on('peer-add', () => emitter.emit('update-peers', { key, peers: archive.metadata.peers.length }))
  archive.metadata.on('peer-remove', () => emitter.emit('update-peers', { key, peers: archive.metadata.peers.length }))
  archive.open(err => track(archive.content, 'content', err))
  function track (feed, name, err) {
    if (err)
      log('[DAT] Error opening archive', err)

    if (feed) {
      // feed.on('update', () => emitter.emit('update-blocks', { key, name, blocks: bitfield(feed), bytes: feed.bytes }))
      feed.on('download', (index, data) => emitter.emit('download', { key, name, index: index, bytes: data.length}))
      feed.on('upload', (index, data) => emitter.emit('upload', { key, name, index: index, bytes: data.length}))
    }
  }
}