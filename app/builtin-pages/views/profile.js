const yo = require('yo-yo')
const co = require('co')
import renderSidebar from '../com/sidebar'
import renderPencilIcon from '../icon/pencil'

// globals
// =

var currentProfile
var isEditingProfile
var tmpAvatar

// main
// =

setup()
async function setup () {
  currentProfile = await beaker.profiles.getCurrentProfile()
  console.log(currentProfile)
  // render
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

// rendering
// =

function render () {
  yo.update(document.querySelector('.profile-wrapper'), yo`
    <div class="profile-wrapper builtin-wrapper">
      ${renderSidebar('profile')}
      <div>
        <div class="builtin-sidebar">
          <h1>Your profile</h1>

          <p class="builtin-blurb">
          </p>

          ${!currentProfile || isEditingProfile
            ? renderProfileEditor()
            : renderProfile()
          }

          ${!isEditingProfile
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
