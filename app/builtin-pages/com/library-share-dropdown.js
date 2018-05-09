/* globals DatArchive */

import * as yo from 'yo-yo'
import toggleable from './toggleable'

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
      <div class="urls">
        ${renderUrl({label: 'Raw URL', url: archive.url})}
        ${renderUrl({label: 'hashbase.io', url: 'dat://foo-pfrazee.hashbase.io'})}
      </div>
      <div class="peers">
        <div class="peers-header">Share with a peer <a><i class="fa fa-question-circle-o"></i></a></div>
        ${renderPeer({hostname: 'hashbase.io', isShared: true, name: 'foo', urls: ['dat://foo-pfrazee.hashbase.io']})}
        ${renderPeer({hostname: 'taravancil.com', isShared: false})}
        <div class="peer-container">
          <div class="peer-header">
            <span class="status"><i class="fa fa-plus"></i> </span>
            <span>Add a peer</span>
          </div>
        </div>
      </div>
    </div>`

  return el
}

function renderUrl ({label, url}) {
  return yo`
    <div class="url-container">
      <div class="url-header">
        <span>${label}</span>
        <a class="link">Copy URL <i class="fa fa-link"></i></a>
      </div>
      <input class="url-input nofocus" value=${url} readonly onclick=${onClickURL} />
    </div>`
}

function renderPeer ({hostname, isShared, name}) {
  return yo`
    <div class="peer-container">
      <div class="peer-header" onclick=${onClickPeer}>
        ${isShared
          ? yo`<span class="status"><i class="fa fa-check"></i></span>`
          : yo`<span class="status"><i class="fa fa-upload"></i></span>`}
        <span>${hostname} <i class="fa fa-angle-down"></i></span>
      </div>
      <form class="peer-controls">
        <h5>Share with ${hostname}</h5>

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