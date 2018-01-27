/* globals beaker FileReader DatArchive Event history */

import yo from 'yo-yo'
import * as cropPopup from '../com/crop-popup'
import renderPencilIcon from '../icon/pencil'
import imgWithFallbacks from '../com/img-with-fallbacks'

// globals
// =

var currentUserProfile
var viewedProfile
var tmpAvatar
var currentView
var bookmarks

// HACK FIX
// the good folk of whatwg didnt think to include an event for pushState(), so let's add one
// -prf
var _wr = function (type) {
  var orig = window.history[type]
  return function () {
    var rv = orig.apply(this, arguments)
    var e = new Event(type.toLowerCase())
    e.arguments = arguments
    window.dispatchEvent(e)
    return rv
  }
}
window.history.pushState = _wr('pushState')
window.history.replaceState = _wr('replaceState')

// main
// =

setup()
async function setup () {
  currentUserProfile = await beaker.profiles.getCurrentUserProfile()
  await loadViewedProfile()

  // render
  render()

  window.addEventListener('pushstate', loadViewedProfile)
  window.addEventListener('popstate', loadViewedProfile)
}

async function parseURLKey () {
  var path = window.location.pathname
  if (path === '/' || !path) return false
  try {
    // extract key from url
    var name = /^\/([^/]+)/.exec(path)[1]
    if (/[0-9a-f]{64}/i.test(name)) return name
    return DatArchive.resolveName(name)
  } catch (e) {
    console.error('Failed to parse URL', e)
    throw new Error('Invalid dat URL')
  }
}

async function loadViewedProfile () {
  // reset state
  tmpAvatar = undefined

  try {
    // load the profile
    var selectedProfileKey = await parseURLKey()
    if (selectedProfileKey) {
      viewedProfile = await beaker.profiles.getUserProfile(`dat://${selectedProfileKey}`)
    }
    if (!(viewedProfile && viewedProfile._origin)) {
      viewedProfile = currentUserProfile
      viewedProfile.isCurrentUserFollowing = false
      history.replaceState({}, null, 'beaker://profile/' + viewedProfile._origin.slice('dat://'.length))
    } else {
      viewedProfile.isCurrentUserFollowing = await beaker.profiles.isFollowing(currentUserProfile._origin, viewedProfile._origin)
    }
    render()

    // load extra data and render again
    await Promise.all(viewedProfile.follows.map(async (f) => {
      f.isCurrentUser = f.url === currentUserProfile._origin
      f.isCurrentUserFollowing = await beaker.profiles.isFollowing(currentUserProfile._origin, f.url)
    }))
    render()
  } catch (e) {
    // TODO
    console.error(e)
  }
}

async function loadBookmarks () {
  bookmarks = await beaker.bookmarks.listPublicBookmarks({
    author: viewedProfile._origin
  })
}

// events
// =

async function onUpdateViewFilter (filter) {
  // reset data
  bookmarks = null

  // update view
  currentView = filter || ''
  if (currentView === 'bookmarks') {
    await loadBookmarks()
  }
  render()
}

async function onSaveProfile (e) {
  e.preventDefault()

  var name = e.target.name.value || ''
  var bio = e.target.bio.value || ''
  await beaker.profiles.setCurrentUserProfile({name, bio})

  // if the avatar's changed, update the profile avatar
  if (tmpAvatar) {
    await beaker.profiles.setCurrentUserAvatar(tmpAvatar.imgData, tmpAvatar.imgExtension)
  }

  tmpAvatar = undefined
  currentView = ''
  viewedProfile = await beaker.profiles.getCurrentUserProfile()
  render()
}

function onUpdateTmpAvatar (e) {
  if (e.target.files) {
    var f = e.target.files[0]
    var reader = new FileReader()

    reader.onload = function () {
      e.target.value = null // clear the input
      cropPopup.create(reader.result, res => {
        document.querySelector('img.editor.avatar').src = res.dataUrl
        tmpAvatar = res
      })
    }
    reader.readAsDataURL(f)
  }
}

function onToggleEditingProfile () {
  currentView = currentView === 'editing' ? '' : 'editing'
  render()
}

async function onToggleFollowing (e, user) {
  e.preventDefault()
  e.stopPropagation()
  var userUrl = user._origin || user.url // we may be given a profile record or a follows record
  if (user.isCurrentUserFollowing) {
    await beaker.profiles.unfollow(userUrl)
    user.isCurrentUserFollowing = false
  } else {
    await beaker.profiles.follow(userUrl, user.name || '')
    user.isCurrentUserFollowing = true
  }
  render()
}

// rendering
// =

function render () {
  if (!viewedProfile) return
  var isEditingProfile = currentView === 'editing'
  var isUserProfile = viewedProfile._origin === currentUserProfile._origin

  yo.update(document.querySelector('.profile-wrapper'), yo`
    <div class="profile-wrapper builtin-wrapper">
      <div>
        <div class="builtin-sidebar">
          ${renderProfile()}

          ${isUserProfile && !isEditingProfile
            ? yo`
              <span class="edit-link" onclick=${onToggleEditingProfile}>
                Edit your profile
                ${renderPencilIcon()}
              </span>`
            : ''}

          <div class="section">
            <h2 class="subtitle-heading">${isUserProfile ? 'Your' : `${viewedProfile.name}${"'"}s`} profile</h2>
            <div class="nav-item ${currentView === 'bookmarks' ? 'active' : ''}" onclick=${() => onUpdateViewFilter('bookmarks')}>
              Bookmarks
            </div>
            <div class="nav-item ${currentView === 'following' ? 'active' : ''}" onclick=${() => onUpdateViewFilter('following')}>
              Following
            </div>
            <div class="nav-item disabled">
              Timeline <span class="coming-soon">Coming soon</span>
            </div>
          </div>
        </div>

        <div class="builtin-main">
          <div class="view">${renderView()}</div>
        </div>
      </div>
    </div>
  </div>`)
}

function renderView () {
  switch (currentView) {
    case 'following':
      return renderFollowing()
    case 'bookmarks':
      return renderBookmarks()
    case 'editing':
      return renderProfileEditor()
    default:
      return ''
  }
}

function renderFollowing () {
  return yo`
    <div class="following-view">
      <h2>Following</h2>

      ${viewedProfile.follows.length === 0 ?
        yo`<div class="empty">${viewedProfile.name} is not following anybody.</div>` :
        ''}
      <div class="following-list">
        ${viewedProfile.follows.map(f => {
          const name = f.name || 'Anonymous'
          return yo`
            <a class="following-card" href="beaker://profile/${f.url.slice('dat://'.length)}" title=${name}>
              ${imgWithFallbacks(`${f.url}/avatar`, ['png', 'jpg', 'jpeg', 'gif'], {cls: 'avatar'})}
              <span class="title">${name}</span>
              ${f.isCurrentUser ? yo`<div class="you-label">You</div>` :
                f.isCurrentUserFollowing ?
                  yo`<button onclick=${(e) => onToggleFollowing(e, f)} class="follow-btn following primary btn">✓</button>` :
                  yo`<button onclick=${(e) => onToggleFollowing(e, f)} class="follow-btn btn">+</button>`}
            </a>
          `
        })}
      </div>
    </div>
  `
}

function renderProfile () {
  if (!viewedProfile) {
    return yo`
      <div class="profile-view">
        <p>Profile not found</p>
      </div>
    `
  }

  var isUserProfile = viewedProfile && viewedProfile._origin === currentUserProfile._origin
  return yo`
    <div class="profile-view">
      <div class="header">
        ${viewedProfile.avatar
          ? yo`
            <div class="avatar-container">
              <img class="avatar" src="${viewedProfile._origin}${viewedProfile.avatar}?cache_buster=${Date.now()}"/>
            </div>`
          : yo`
            <div class="avatar-container">
              <span class="avatar empty"></span>
            </div>`
        }

        <span class="name">${viewedProfile.name}</span>
      </div>

      <p class="bio">${viewedProfile.bio}</p>

      ${isUserProfile ? '' : renderFollowButton()}
    </div>
  `
}

function renderBookmarks () {
  return yo`
    <div>
      <h2>Bookmarks</h2>
      <div class="links-list bookmarks">
        ${bookmarks.length
          ? bookmarks.map(renderBookmark)
          : yo`<em class="empty">No bookmarks</em>`
        }
      </div>
    </div>
  `
}

function renderBookmark (row, i) {
  return yo`
    <li class="ll-row bookmarks__row" data-row=${i}>
      <a class="link bookmark__link" href=${row.href} title=${row.title} />
        <img class="favicon bookmark__favicon" src=${'beaker-favicon:' + row.href} />
        <span class="title bookmark__title">
          ${row.title.startsWith('dat://')
            ? yo`<em>Untitled</em>`
            : yo`${row.title}`
          }
        </span>
        <span class="url bookmark__url">${row.href}</span>
      </a>
    </li>`
}

function renderProfileEditor () {
  return yo`
    <div>
      <h2>Edit your profile</h2>

      <form class="edit-profile" onsubmit=${onSaveProfile}>

        <label for="avatar">Avatar</label>
        <div title="Update your avatar" class="avatar-container">
          <input onchange=${onUpdateTmpAvatar} name="avatar" class="avatar-input" type="file" accept="image/*"/>
          <img class="avatar editor" src="${viewedProfile.avatar ? viewedProfile._origin + viewedProfile.avatar : ''}?cache-buster=${Date.now()}"/>
          ${viewedProfile.avatar ? '' : yo`<span class="avatar editor empty">+</span>`}
        </div>

        <label for="name">Name</label>
        <input autofocus type="text" name="name" placeholder="Name" value=${viewedProfile.name || ''}/>

        <label for="bio">Bio (optional)</label>
        <textarea name="bio" placeholder="Enter a short bio">${viewedProfile.bio || ''}</textarea>

        <div class="actions">
          <button type="button" class="btn" onclick=${onToggleEditingProfile}>Cancel</button>
          <button type="submit" class="btn primary">Save</button>
        </div>
      </form>
    </div>
  `
}

function renderFollowButton () {
  return yo`
    <button class="follow-btn btn primary" onclick=${(e) => onToggleFollowing(e, viewedProfile)}>
      ${viewedProfile.isCurrentUserFollowing ? 'Following ✓' : 'Follow +'}
    </button>`
}
