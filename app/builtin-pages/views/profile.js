const yo = require('yo-yo')
const co = require('co')
import renderSidebar from '../com/sidebar'
import renderPencilIcon from '../icon/pencil'

// globals
// =

var currentUserProfile
var currentProfile
var isEditingProfile
var tmpAvatar
var currentView

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
  currentUserProfile = await beaker.profiles.getCurrentProfile()
  await loadCurrentProfile()

  // render
  render()

  window.addEventListener('pushstate', loadCurrentProfile)
  window.addEventListener('popstate', loadCurrentProfile)
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

async function loadCurrentProfile () {
  // reset state
  isEditingProfile = false
  tmpAvatar = undefined

  try {
    var selectedProfileKey = await parseURLKey()
    currentProfile = await beaker.profiles.getProfile(`dat://${selectedProfileKey}`)

    if (!(currentProfile && currentProfile._origin)) {
      currentProfile = currentUserProfile
      history.pushState({}, null, 'beaker://profile/' + currentProfile._origin.slice('dat://'.length))
    }

    currentProfile.isFollowing = await beaker.profiles.isFollowing(currentUserProfile._origin, currentProfile._origin)
  } catch (e) {
    // TODO
  }

  render()
}

// events
// =

async function onUpdateViewFilter (filter) {
  currentView = filter || ''
  render()
}

async function onSaveProfile (e) {
  e.preventDefault()

  var name = e.target.name.value || ''
  var bio = e.target.bio.value || ''
  await beaker.profiles.setCurrentProfile({name, bio})

  // if the avatar's changed, update the profile avatar
  if (tmpAvatar) {
    await beaker.profiles.setCurrentAvatar(tmpAvatar.imgData, tmpAvatar.imgExtension)
  }

  tmpAvatar = undefined
  isEditingProfile = false
  currentProfile = await beaker.profiles.getCurrentProfile()
  render()
}

function onUpdateTmpAvatar (e) {
  if (e.target.files) {
    var f = e.target.files[0]
    var reader = new FileReader()

    reader.onload = function () {
      document.querySelector('img.editor.avatar').src = reader.result
      tmpAvatar = {
        imgData: reader.result.split(',')[1],
        imgExtension: f.name.split('.')[1] || '',
      }
    }
    reader.readAsDataURL(f)
  }
}

function onToggleEditingProfile () {
  currentView = currentView === 'editing' ? '' : 'editing'
  render()
}

async function onToggleFollowing () {
  if (currentProfile.isFollowing) {
    await beaker.profiles.unfollow(currentUserProfile._origin, currentProfile._origin)
    currentProfile.isFollowing = false
  } else {
    await beaker.profiles.follow(currentUserProfile._origin, currentProfile._origin, currentProfile.name || '')
    currentProfile.isFollowing = true
  }
  render()
}

// rendering
// =

function render () {
  var isEditingProfile = currentView === 'editing'
  var isUserProfile = currentProfile && currentProfile._origin === currentUserProfile._origin

  yo.update(document.querySelector('.profile-wrapper'), yo`
    <div class="profile-wrapper builtin-wrapper">
      ${renderSidebar('profile')}
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
            <h2>${isUserProfile ? 'Your' : `${currentProfile.name}'s`} profile</h2>
            <div class="nav-item ${currentViewFilter === 'following' ? 'active' : ''}" onclick=${() => onUpdateViewFilter('following')}>
              Following
            </div>
            <div class="nav-item ${currentViewFilter === 'following' ? 'bookmarks' : ''}" onclick=${() => onUpdateViewFilter('bookmarks')}>
              Bookmarks
            </div>
            <div class="nav-item ${currentViewFilter === 'feed' ? 'active' : ''}" onclick=${() => onUpdateViewFilter('feed')}>
              Feed
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
  console.log('currentView', currentView)
  switch (currentView) {
    case 'following':
      return renderFollowing()
    case 'editing':
      return renderProfileEditor()
    default:
      return ''
  }
}

function renderFollowing () {
  return yo`
    <div>
      <h2>Following</h2>

      <div class="links-list">
        ${currentProfile.follows.map(f => yo`
          <div class="ll-row">
            <a class="link" href="beaker://profile/${f.url.slice('dat://'.length)}" title=${f.name || ''} />
              <span class="title">${f.name || ''}</span>
            </a>
            <div class="actions bookmark__actions">
            </div>
          </div>`
        )}
      </div>
    </div>
  `
}

function renderProfile () {
  if (!currentProfile) {
    return yo`
      <div class="profile-view">
        <p>Profile not found</p>
      </div>
    `
  }

  var isUserProfile = currentProfile && currentProfile._origin === currentUserProfile._origin
  return yo`
    <div class="profile-view">
      <div class="header">
        ${currentProfile.avatar
          ? yo`
            <div class="avatar-container">
              <img class="avatar" src="${currentProfile._origin}${currentProfile.avatar}?cache_buster=${Date.now()}"/>
            </div>`
          : yo`
            <div class="avatar-container">
              <span class="avatar empty"></span>
            </div>`
        }

        <span class="name">${currentProfile.name}</span>
      </div>

      <p class="bio">${currentProfile.bio}</p>

      ${isUserProfile ? '' : renderFollowButton()}
    </div>
  `
}

function renderProfileEditor () {
  console.log('rendering')
  return yo`
    <div>
      <h2>Edit your profile</h2>

      <form class="edit-profile" onsubmit=${onSaveProfile}>

        <label for="avatar">Avatar</label>
        <div title="Update your avatar" class="avatar-container">
          <input onchange=${onUpdateTmpAvatar} name="avatar" class="avatar-input" type="file" accept="image/*"/>
          <img class="avatar editor" src=${currentProfile.avatar ? currentProfile._origin + currentProfile.avatar : ''}/>
          ${currentProfile.avatar ? '' : yo`<span class="avatar editor empty">+</span>`}
        </div>

        <label for="name">Name</label>
        <input autofocus type="text" name="name" placeholder="Name" value=${currentProfile.name || ''}/>

        <label for="bio">Bio (optional)</label>
        <textarea name="bio" placeholder="Enter a short bio">${currentProfile.bio || ''}</textarea>

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
    <button class="follow-btn btn primary" onclick=${onToggleFollowing}>
      ${currentProfile.isFollowing ? 'Following ✓' : 'Follow +'}
    </button>`
}
