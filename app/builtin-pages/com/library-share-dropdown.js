/* globals DatArchive */

import * as yo from 'yo-yo'
import toggleable from './toggleable'
import * as dedicatedPeers from '../../lib/fg/dedicated-peers'
import {URL_DEDICATED_PEER_GUIDE} from '../../lib/const'

// exported api
// =

export default function render (archive) {
  const renderInnerClosure = () => renderInner(archive)
  return toggleable(yo`
    <div class="dropdown toggleable-container library-share-dropdown">
      <button class="btn plain toggleable">
        <i class="fa fa-share-alt-square"></i>
      </button>

      <div class="dropdown-items right toggleable-open-container"></div>
    </div>
  `, renderInnerClosure)
}

// internal methods
// =

function renderInner (archive) {
  var el = yo`
    <div>
      ${renderUrls(archive)}
      ${renderPeers(archive)}
    </div>`
  
  dedicatedPeers.getAllPins(archive.url).then(({accounts, urls}) => {
    yo.update(el.querySelector('.urls'), renderUrls(archive, urls))
    yo.update(el.querySelector('.peers'), renderPeers(archive, accounts))
  }, console.error)

  return el
}

function renderUrls (archive, urls = []) {
  return yo`
    <div class="urls">
      ${renderUrl({label: 'Raw URL', url: archive.url})}
      ${urls.map(url => renderUrl({url}))}
    </div>`
}

function renderPeers (archive, accounts = []) {
  return yo`
    <div class="peers">
      <div class="peers-header">
        Share with a dedicated peer
        <a href=${URL_DEDICATED_PEER_GUIDE} title="What is a dedicated peer?" target="_blank"><i class="fa fa-question-circle-o"></i></a>
      </div>
      ${accounts.map(account => renderPeer({origin: account.origin, isShared: false}))}
      <div class="peer-container">
        <div class="peer-header">
          <span class="status"><i class="fa fa-plus"></i> </span>
          <span>Add a peer</span>
        </div>
      </div>
    </div>`
}

function renderUrl ({label, url}) {
  return yo`
    <div class="url-container">
      <div class="url-header">
        <span>${label || ''}</span>
        <a class="link">Copy URL <i class="fa fa-link"></i></a>
      </div>
      <input class="url-input nofocus" value=${url} readonly onclick=${onClickURL} />
    </div>`
}

function renderPeer ({origin, isShared, name}) {
  return yo`
    <div class="peer-container">
      <div class="peer-header" onclick=${onClickPeer}>
        ${isShared
          ? yo`<span class="status"><i class="fa fa-check"></i></span>`
          : yo`<span class="status"><i class="fa fa-upload"></i></span>`}
        <span>${origin} <i class="fa fa-angle-down"></i></span>
      </div>
      <form class="peer-controls">
        <h5>Share with ${origin}</h5>

        <div>
          <label>Name</label>
          <input placeholder="Name" value=${name || ''} />
        </div>

        ${isShared
          ? yo`
            <div class="form-actions">
              <button class="btn primary">Update</button>
              <button class="btn"><i class="fa fa-trash"></i></button>
            </div>`
          : yo`
            <div class="form-actions">
              <button class="btn primary">Share</button>
            </div>`}
      </form>
    </div>`
}

function onClickPeer (e) {
  e.currentTarget.parentNode.classList.toggle('expanded')
}

function onClickURL (e) {
  e.currentTarget.select()
}