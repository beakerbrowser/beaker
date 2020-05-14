/* globals DatArchive beaker */

import yo from 'yo-yo'
import {shortenHash} from '../../../lib/strings'

const COLUMN_SETS = {
  discovery: ['archiveKey', 'event', 'peer', 'trafficType', 'messageId', 'message'],
  connections: ['archiveKey', 'event', 'peer', 'connectionId', 'connectionType', 'ts', 'message'],
  errors: ['archiveKey', 'event', 'peer', 'message']
}
const EVENT_SETS = {
  discovery: ['traffic', 'peer-found', 'peer-rejected', 'peer-dropped', 'peer-banned'],
  connections: ['connecting', 'connect-timeout', 'connect-failed', 'handshaking', 'handshake-timeout', 'connection-established', 'replicating', 'connection-error', 'connection-closed', 'redundant-connection'],
  errors: ['swarm-error', 'archive-error', 'connection-error', 'error']
}
const STAT_SETS = {
  peer: ['peer-found', 'connecting', 'handshaking', 'connection-established', 'connection-closed', 'handshake-timeout', 'connection-error', 'connect-failed', 'peer-dropped'],
  archive: ['peer-found', 'connecting', 'handshaking', 'connection-established', 'connection-closed', 'handshake-timeout', 'connection-error', 'connect-failed', 'peer-dropped', 'swarming'],
  time: ['swarming', 'peer-found', 'connecting', 'handshaking', 'connection-established', 'connection-closed', 'handshake-timeout', 'connect-failed', 'peer-dropped', 'connection-error', 'swarm-error', 'archive-error']
}

// globals
// =

var archiveKey = false
var peers = []
var logEntries = []
var stats = {
  currentlyConnecting: 0,
  currentlyConnected: 0,
  eventsByPeer: {},
  eventsByArchive: {},
  eventsByTime: {}
}
var activeView
var activeColumns
var activeEvents
var filterStr = ''
var filter = false
var renderInterval

setup()
async function setup () {
  try {
    archiveKey = await parseURL()
  } catch (e) {
    renderUsage(e.message)
    return
  }
  setView('stats')
  render()

  if (archiveKey) {
    // archive-specific data
    var archive = new DatArchive(archiveKey)
    peers = (await archive.getInfo()).peerInfo
    updatePeers()
    beaker.archives.addEventListener('network-changed', ({details}) => {
      if (details.url.slice('dat://'.length) === archiveKey) {
        peers = details.peers
        updatePeers()
      }
    })
  }

  var debugEvents = beaker.archives.createDebugStream()
  debugEvents.addEventListener(archiveKey || 'all', onLog)
  logEntries = (await beaker.archives.getDebugLog(archiveKey)).split('\n').map(parseJSON).filter(Boolean)
  logEntries.forEach(tabulateStat)
  render()
}

function setView (view) {
  if (renderInterval) clearInterval(renderInterval)
  filter = false
  filterStr = ''
  activeView = view
  activeColumns = COLUMN_SETS[view]
  activeEvents = EVENT_SETS[view]
  if (view === 'stats') {
    renderInterval = setInterval(render, 5e3)
  }
}

async function parseURL () {
  var path = window.location.pathname
  if (path === '/' || !path) {
    return false
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

function tabulateStat (logEntry) {
  var {peer, archiveKey, event} = logEntry

  if (event === 'traffic') return // ignore

  switch (event) {
    case 'connecting':
      stats.currentlyConnecting++
      break
    case 'connect-failed':
      stats.currentlyConnecting--
      break
    case 'handshaking':
      stats.currentlyConnecting--
      stats.currentlyConnected++
      break
    case 'connection-closed':
      stats.currentlyConnected--
      break
  }

  if (peer) {
    stats.eventsByPeer[peer] = stats.eventsByPeer[peer] || {}
    stats.eventsByPeer[peer][event] = stats.eventsByPeer[peer][event] || 0
    stats.eventsByPeer[peer][event]++
    if (!STAT_SETS.peer.includes(event)) console.error('Event not tabulated for peer:', event)
  }

  if (archiveKey) {
    stats.eventsByArchive[archiveKey] = stats.eventsByArchive[archiveKey] || {}
    stats.eventsByArchive[archiveKey][event] = stats.eventsByArchive[archiveKey][event] || 0
    stats.eventsByArchive[archiveKey][event]++
    if (!STAT_SETS.archive.includes(event)) console.error('Event not tabulated for archive:', event)
  }

  var timeSegment = getTimeSegment()
  var isNewTimeSegment = !(timeSegment in stats.eventsByTime)
  if (isNewTimeSegment && activeView === 'events') {
    render()
  }
  stats.eventsByTime[timeSegment] = stats.eventsByTime[timeSegment] || {}
  stats.eventsByTime[timeSegment][event] = stats.eventsByTime[timeSegment][event] || 0
  stats.eventsByTime[timeSegment][event]++
}

function getTimeSegment () {
  return Math.floor(Date.now() / 5e3) * 5e3
}

// rendering
// =

function render () {
  yo.update(document.querySelector('main'), yo`
    <main>
      <div class="header">
        <h1><i class="fa fa-bug"></i> Swarm debugger (${archiveKey ? shortenHash(archiveKey) : 'all archives'})</h1>
        <div id="filter">
          ${filter
            ? yo`<button class="btn" onclick=${onClearFilter}>Clear</button>`
            : ''}
          <input type="text" placeholder="Filter" onchange=${onChangeFilter} value=${filterStr} />
        </div>
        <nav>
          ${renderNavItem('stats', 'Stats')}
          ${renderNavItem('events', 'Events')}
          ${renderNavItem('connections', 'Connection log')}
          ${renderNavItem('discovery', 'Discovery log')}
          ${renderNavItem('errors', 'Error log')}
        </nav>
      </div>
      ${activeView === 'stats'
        ? yo`
          <div class="view">
            <section class="columns">
              <div><h3>Connected</h3><div>${stats.currentlyConnected}</div></div>
              <div><h3>Connecting</h3><div>${stats.currentlyConnecting}</div></div>
              ${archiveKey
                ? yo`
                  <div>
                    <h3>Peers</h3>
                    ${renderPeers()}
                  </div>`
                : ''}
            </section>
            <section>
              <h3>Events (grouped by peer)</h3>
              ${renderEventsByPeer()}
            </section>
            <section>
              <h3>Events (grouped by archive)</h3>
              ${renderEventsByArchive()}
            </section>
          </div>`
        : ''}
      ${activeView === 'events'
        ? yo`<div class="view">${renderEventsByTime()}</div>`
        : ''}
      ${activeView !== 'stats' && activeView !== 'events'
        ? yo`
          <div class="view">
            <table class="log">
              <thead>${renderActiveColumns()}</thead>
              <tbody class="log-entries" onclick=${onClickLogEntry}>${renderLog()}</tbody>
            </table>
          </div>`
        : ''}
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
  return logEntries.filter(shouldRender).slice(-500).map(renderLogEntry)
}

function renderEventsByPeer () {
  return yo`
    <table class="event-stats">
      <thead>
        <tr>
          <td>peer</td>
          ${STAT_SETS.peer.map(event => yo`<td>${event}</td>`)}
        </tr>
      </thead>
      <tbody>
        ${Object.entries(stats.eventsByPeer).map(([peer, eventStats]) => {
          var columns = STAT_SETS.peer.map(event => yo`<td class="${eventStats[event] ? '' : 'gray'}">${eventStats[event] || 0}</td>`)
          return yo`<tr><td>${peer}</td>${columns}</tr>`
        })}
      </tbody>
    </div>`
}

function renderEventsByArchive () {
  return yo`
    <table class="event-stats">
      <thead>
        <tr>
          <td>archive</td>
          ${STAT_SETS.archive.map(event => yo`<td>${event}</td>`)}
        </tr>
      </thead>
      <tbody>
        ${Object.entries(stats.eventsByArchive).map(([archiveKey, eventStats]) => {
          var columns = STAT_SETS.archive.map(event => yo`<td class="${eventStats[event] ? '' : 'gray'}">${eventStats[event] || 0}</td>`)
          return yo`<tr><td>${archiveKey}</td>${columns}</tr>`
        })}
      </tbody>
    </table>`
}

function renderEventsByTime () {
  return yo`
    <table class="event-stats">
      <thead>
        <tr>
          <td>time segment</td>
          ${STAT_SETS.time.map(event => yo`<td>${event}</td>`)}
        </tr>
      </thead>
      <tbody>
        ${Object.entries(stats.eventsByTime).map(([time, eventStats]) => {
          var columns = STAT_SETS.time.map(event => yo`<td class="${eventStats[event] ? '' : 'gray'}">${eventStats[event] || 0}</td>`)
          return yo`<tr><td>${(new Date(+time)).toLocaleTimeString()}</td>${columns}</tr>`
        })}
      </tbody>
    </table>`
}

function renderPeers () {
  return yo`
    <div class="peers">
      ${peers.map(peer => yo`<div>${peer.host}:${peer.port}</div>`)}
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
  tabulateStat(data)
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
