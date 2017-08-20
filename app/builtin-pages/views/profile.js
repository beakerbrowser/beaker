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
  isEditingProfile = !isEditingProfile
  render()
}

async function onToggleFollowing () {
  if (currentProfile.isFollowing) {
    await beaker.profiles.unfollow(currentUserProfile._origin, currentProfile._origin)
    currentProfile.isFollowing = false
  } else {
    await beaker.profiles.follow(currentUserProfile._origin, currentProfile._origin)
    currentProfile.isFollowing = true
  }
  render()
}

// rendering
// =

function render () {
  var isUserProfile = currentProfile && currentProfile._origin === currentUserProfile._origin

  yo.update(document.querySelector('.profile-wrapper'), yo`
    <div class="profile-wrapper builtin-wrapper">
      ${renderSidebar('profile')}
      <div>
        <div class="builtin-sidebar">
          ${renderProfile()}
          ${isUserProfile && isEditingProfile ? renderProfileEditor() : ''}

          ${isUserProfile && !isEditingProfile
            ? yo`
              <span class="edit-link" onclick=${onToggleEditingProfile}>
                Edit your profile
                ${renderPencilIcon()}
              </span>`
            : ''}
        </div>

        <div class="builtin-main"></div>
      </div>
    </div>
  </div>`)
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
  return yo`
    <form class="edit-profile" onsubmit=${onSaveProfile}>
      <h2>Edit your profile</h2>

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
    </form>
  `
}

function renderFollowButton () {
  return yo`
    <button class="follow-btn btn primary" onclick=${onToggleFollowing}>
      ${currentProfile.isFollowing ? 'Following ✓' : 'Follow +'}
    </button>`
}
