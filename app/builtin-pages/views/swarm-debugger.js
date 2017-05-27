import * as yo from 'yo-yo'

// globals
// =

var archiveKey = ''
var peers = []

setup()
async function setup () {
  archiveKey = await parseURL()
  render()

  var archive = new DatArchive(archiveKey)
  var info = await archive.getInfo()
  peers = info.peerInfo
  updatePeers()

  // wire up events
  beaker.archives.addEventListener('network-changed', ({details}) => {
    if (details.url.slice('dat://'.length) === archiveKey) {
      peers = details.peers
      updatePeers()
    }
  })
}


async function parseURL () {
  var path = window.location.pathname
  if (path === '/' || !path) {
    throw new Error('Invalid dat URL')
  }
  try {
    // extract key from url
    var [_, key] = /^\/([^\/]+)/.exec(path)
    if (/[0-9a-f]{64}/i.test(key) == false) {
      key = await DatArchive.resolveName(key)
    }
    return key
  } catch (e) {
    console.error('Failed to parse URL', e)
    throw new Error('Invalid dat URL')
  }
}

// rendering
// =

function render () {
  yo.update(document.querySelector('main'), yo`
    <main>
      <div class="columns">
        <div class="column">
          <h1><i class="fa fa-bug"></i> Swarm debugger</h1>
          <h2>Peers</h2>
          <div class="peers"></div>
        </div>
        <div class="column log"></div>
      </div>
    </main>
  `)
}

function updatePeers () {
  yo.update(document.querySelector('.peers'), yo`
    <div class="peers">
      ${peers.map(peer => {
        return yo`<div>${peer.host}:${peer.port}</div>`
      })}
      ${peers.length === 0 ? yo`<p>No peers are currently connected for this archive.</p>` : ''}
    </div>
  `)

}
