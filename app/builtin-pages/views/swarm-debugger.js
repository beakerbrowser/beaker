/* globals DatArchive beaker */

import * as yo from 'yo-yo'

const COLUMN_SETS = {
  discovery: ['event', 'peer', 'trafficType', 'messageId', 'message'],
  connections: ['event', 'peer', 'connectionId', 'connectionType', 'ts', 'discoveryKey', 'message']
}
const EVENT_SETS = {
  discovery: ['peer-found', 'traffic'],
  connections: ['swarming', 'unswarming', 'connection-handshake', 'replicating', 'connection-error', 'connection-close']
}

// globals
// =

var archiveKey = ''
var peers = []
var logEntries = []
var activeView
var activeColumns
var activeEvents

setup()
async function setup () {
  archiveKey = await parseURL()
  setView('connections')
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
  var debugEvents = beaker.archives.createDebugStream()
  debugEvents.addEventListener(archiveKey, onLog)
}

function setView (view) {
  activeView = view
  activeColumns = COLUMN_SETS[view]
  activeEvents = EVENT_SETS[view]
}

async function parseURL () {
  var path = window.location.pathname
  if (path === '/' || !path) {
    throw new Error('Invalid dat URL')
  }
  try {
    // extract key from url
    var parts = /^\/([^/]+)/.exec(path)
    var key = parts[1]
    if (/[0-9a-f]{64}/i.test(key) == false) {
      key = await DatArchive.resolveName(key)
    }
    return key
  } catch (e) {
    console.error('Failed to parse URL', e)
    throw new Error('Invalid dat URL')
  }
}

function shouldRender (logEntry) {
  return activeEvents.includes(logEntry.event)
}

// rendering
// =

function render () {
  yo.update(document.querySelector('main'), yo`
    <main>
      <h1><i class="fa fa-bug"></i> Swarm debugger</h1>
      <nav>
        ${renderNavItem('connections', 'Connection log')}
        ${renderNavItem('discovery', 'Discovery log')}
        ${renderNavItem('stats', 'Stats')}
      </nav>
      ${activeView === 'stats'
        ? yo`
          <div class="view">
            <section>
              <h3>Peers</h3>
              ${renderPeers()}
            </section>
          </div>`
        : yo`
          <div class="view">
            <table class="log">
              <thead>${renderActiveColumns()}</thead>
              <tbody class="log-entries">${renderLog()}</tbody>
            </table>
          </div>`}
    </main>
  `)
}

function renderNavItem (view, label) {
  return yo`
    <a
      class=${view === activeView ? 'active' : ''}
      onclick=${() => {setView(view); render()}}>
      ${label}
    </a>`
}

function renderActiveColumns () {
  return yo`
    <tr>
      ${activeColumns.map(key => yo`<td>${key}</td>`)}
    </tr>`
}

function renderLogEntry (data) {
  return yo`
    <tr>
      ${activeColumns.map(key => yo`<td>${formatLogValue(key, data[key])}</td>`)}
    </tr>`
}

function renderLog () {
  return logEntries.filter(shouldRender).map(renderLogEntry)
}

function renderPeers () {
  return yo`
    <div class="peers">
      ${peers.map(peer => yo`<div>${peer.host}:${peer.port}</div>`)}
      ${peers.length === 0 ? yo`<p>No peers are currently connected for this archive.</p>` : ''}
    </div>`
}

function updatePeers () {
  if (activeView === 'peers') {
    yo.update(document.querySelector('.peers'), renderPeers())
  }
}

function onLog (data) {
  console.debug(data)
  logEntries.push(data)
  if (shouldRender(data)) {
    document.querySelector('.log-entries').appendChild(renderLogEntry(data))
  }
}

function formatLogValue (key, value) {
  if (key === 'ts') {
    return value + 'ms'
  }
  return value
}
