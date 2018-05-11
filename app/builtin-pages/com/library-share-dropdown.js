/* globals DatArchive */

import * as yo from 'yo-yo'
import slugify from 'slugify'
import toggleable from './toggleable'
import * as dedicatedPeers from '../../lib/fg/dedicated-peers'
import {URL_DEDICATED_PEER_GUIDE} from '../../lib/const'

// globals
// =

var pinState
var expandedPeers = {}
var error

// exported api
// =

export default function render (archive) {
  const renderInnerClosure = () => renderInner(archive)
  return toggleable(yo`
    <div class="dropdown toggleable-container library-share-dropdown" data-toggle-id="library-share-dropdown">
      <button class="btn plain toggleable">
        <i class="fa fa-share-alt-square"></i>
      </button>

      <div class="dropdown-items right toggleable-open-container"></div>
    </div>
  `, renderInnerClosure)
}

// internal methods
// =

function loadPinState (archive) {
  dedicatedPeers.getAllPins(archive.url).then(({accounts, urls}) => {
    pinState = {accounts, urls}
    expandedPeers = {}
    updatePage(archive)
  }, console.error)
}

function updatePage (archive) {
  yo.update(document.body.querySelector('.library-share-dropdown .dropdown-items > div'), renderInner(archive))
}

function renderInner (archive) {
  if (!pinState) loadPinState(archive)

  return yo`
    <div>
      ${renderUrls(archive, pinState && pinState.urls)}
      ${renderAccounts(archive, pinState && pinState.accounts)}
    </div>`
}

function renderUrls (archive, urls = []) {
  return yo`
    <div class="urls">
      ${renderUrl({label: 'Raw URL', url: archive.url})}
      ${urls.map(url => renderUrl({url}))}
    </div>`
}

function renderAccounts (archive, accounts = []) {
  return yo`
    <div class="peers">
      <div class="peers-header">
        Share with a dedicated peer
        <a href=${URL_DEDICATED_PEER_GUIDE} title="What is a dedicated peer?" target="_blank"><i class="fa fa-question-circle-o"></i></a>
      </div>
      ${accounts.map((account, i) => renderAccount(archive, account, i))}
      ${error ? yo`<div class="message error"><i class="fa fa-exclamation"></i> <span>${error}</span></div>` : ''}
    </div>`
}

function renderUrl ({label, url}) {
  if (!label) {
    label = url.startsWith('http') ? 'HTTP' : 'Dat'
  }
  return yo`
    <div class="url-container">
      <div class="url-header">
        <span>${label}</span>
        <a class="link">Copy URL <i class="fa fa-link"></i></a>
      </div>
      <input class="url-input nofocus" value=${url} readonly onclick=${onClickURL} />
    </div>`
}

function renderAccount (archive, account, i) {
  var {origin, username, isShared, datName} = account
  return yo`
    <div class="peer-container ${expandedPeers[i] ? 'expanded' : ''}">
      <div class="peer-header">
        <span class="origin">${origin}</span>
        <span class="username">${username}</span>
        ${isShared
          ? yo`<span class="status" onclick=${e => onToggleAccount(archive, i)}><i class="fa fa-check"></i></span>`
          : yo`<a class="btn" onclick=${e => onAddPin(e, archive, account)}><i class="fa fa-upload"></i> Share</a>`}
      </div>
      <form class="peer-controls">
        <div>
          <label>Name</label>
          <input name="datName" placeholder="Name" value=${datName || ''} />
        </div>

        ${isShared
          ? yo`
            <div class="form-actions">
              <button class="btn primary" onclick=${e => onUpdatePin(e, archive, account)}>Update</button>
              <button class="btn" onclick=${e => onDeletePin(e, archive, account)}><i class="fa fa-trash"></i></button>
            </div>`
          : yo`
            <div class="form-actions">
              <button class="btn primary">Share</button>
            </div>`}
      </form>
    </div>`
}

function onToggleAccount (archive, i) {
  expandedPeers[i] = !expandedPeers[i]
  updatePage(archive)
}

async function onAddPin (e, archive, account) {
  e.preventDefault()

  // render spinner
  error = null
  e.currentTarget.innerHTML = '<div class="spinner"></div>'

  // make request
  var name = slugify(archive.info.title, {remove: /[^\w]/g}).toLowerCase()
  var res = await dedicatedPeers.pinDat(account, archive.url, name || 'untitled')

  // update
  if (res.success) {
    loadPinState(archive)
  } else {
    console.error('Failed to share with peer', res)
    error = res.body && typeof res.body.message === 'string' ? res.body.message : 'Failed to share with peer'
    updatePage(archive)
  }
}

async function onUpdatePin (e, archive, account) {
  e.preventDefault()

  // render spinner
  error = null
  e.currentTarget.innerHTML = '<div class="spinner"></div>'

  // make request
  var name = e.currentTarget.form.datName.value
  console.log(name)
  var res = await dedicatedPeers.updatePin(account, archive.url, name)

  // update
  if (res.success) {
    loadPinState(archive)
  } else {
    console.error('Failed to remove from peer', res)
    error = res.body && typeof res.body.message === 'string' ? res.body.message : 'Failed to remove from peer'
    updatePage(archive)
  }
}

async function onDeletePin (e, archive, account) {
  e.preventDefault()

  // render spinner
  error = null
  e.currentTarget.innerHTML = '<div class="spinner"></div>'

  // make request
  var res = await dedicatedPeers.unpinDat(account, archive.url)

  // update
  if (res.success) {
    loadPinState(archive)
  } else {
    console.error('Failed to remove from peer', res)
    error = res.body && typeof res.body.message === 'string' ? res.body.message : 'Failed to remove from peer'
    updatePage(archive)
  }
}

function onClickURL (e) {
  e.currentTarget.select()
}