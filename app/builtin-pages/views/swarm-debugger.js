/* globals DatArchive beaker */

import * as yo from 'yo-yo'

const COLUMN_SETS = {
  discovery: ['event', 'peer', 'trafficType', 'messageId', 'message'],
  connections: ['event', 'peer', 'connectionId', 'connectionType', 'ts', 'message']
}
const EVENT_SETS = {
  discovery: ['traffic', 'peer-found', 'peer-rejected', 'peer-dropped', 'peer-banned'],
  connections: ['connecting', 'connect-timeout', 'connect-failed', 'handshaking', 'handshake-timeout', 'connection-established', 'replicating', 'connection-error', 'connection-closed', 'redundant-connection']
}

// globals
// =

var archiveKey = ''
var peers = []
var logEntries = []
var activeView
var activeColumns
var activeEvents
var filterStr = ''
var filter = false

setup()
async function setup () {
  try {
    archiveKey = await parseURL()
  } catch (e) {
    renderUsage(e.message)
    return
  }
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
  logEntries = (await beaker.archives.getDebugLog(archiveKey)).split('\n').map(parseJSON).filter(Boolean)
  render()
}

function setView (view) {
  filter = false
  filterStr = ''
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
    if (path.startsWith('/')) {
      path = path.slice(1)
    }
    if (path.startsWith('dat://')) {
      path = path.slice('dat://'.length)
    }
    var parts = /^([^/]+)/.exec(path)
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
  // event filter
  if (!activeEvents || !activeEvents.includes(logEntry.event)) {
    return false
  }
  // user filter
  if (filter) {
    for (let k in filter) {
      if (logEntry[k] != filter[k]) {
        return false
      }
    }
  }
  return true
}

// rendering
// =

function render () {
  yo.update(document.querySelector('main'), yo`
    <main>
      <h1><i class="fa fa-bug"></i> Swarm debugger</h1>
      <div id="filter">
        ${filter
          ? yo`<button class="btn" onclick=${onClearFilter}>Clear</button>`
          : ''}
        <input type="text" placeholder="Filter" onchange=${onChangeFilter} value=${filterStr} />
      </div>
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
              <tbody class="log-entries" onclick=${onClickLogEntry}>${renderLog()}</tbody>
            </table>
          </div>`}
    </main>
  `)
}

function renderNavItem (view, label) {
  return yo`
    <a
      class=${view === activeView ? 'active' : ''}
      onclick=${() => { setView(view); render() }}>
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

function renderUsage (err) {
  yo.update(document.querySelector('main'), yo`
    <main>
      <h1>${err}</h1>
      <h2>A valid dat URL is required in the URL path.</h2>
    </main>
  `)
}

function updatePeers () {
  if (activeView === 'peers') {
    yo.update(document.querySelector('.peers'), renderPeers())
  }
}

function onChangeFilter (e) {
  filter = {}
  filterStr = e.target.value

  // parse the filter string
  let matches
  let re = /([\S]+)=([\S]+)/g
  while ((matches = re.exec(filterStr))) {
    filter[matches[1]] = matches[2]
  }
  console.log('Applying filter', filter)

  // disable filter if no values
  if (Object.keys(filter).length === 0) {
    filter = false
  }
  render()
}

function onClearFilter () {
  filter = false
  filterStr = ''
  render()
}

function onClickLogEntry (e) {
  let el = e.target
  if (el.tagName !== 'TD') return

  let columnIndex = Array.from(el.parentNode.childNodes).indexOf(el) - 1
  if (columnIndex < 0 || columnIndex >= activeColumns) return

  let key = activeColumns[columnIndex]
  let value = ('' + el.innerText).trim()

  filter = filter || {}
  filter[key] = value
  filterStr = Object.keys(filter).map(k => `${k}=${filter[k]}`).join(' ')

  render()
}

function onLog (data) {
  console.debug(data)
  logEntries.push(data)
  if (shouldRender(data)) {
    document.querySelector('.log-entries').appendChild(renderLogEntry(data))
  }
}

function formatLogValue (key, value) {
  if (key === 'ts' && typeof value !== 'undefined') {
    return (+value) + 'ms'
  }
  return value
}

function parseJSON (str) {
  try {
    if (!str) return
    return JSON.parse(str)
  } catch (e) {
    console.log(e)
  }
}
