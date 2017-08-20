const yo = require('yo-yo')
const co = require('co')
import renderSidebar from '../com/sidebar'
import renderPencilIcon from '../icon/pencil'

// globals
// =

var currentProfile
var isEditingProfile = false

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

  currentProfile.name = name
  currentProfile.bio = bio
  isEditingProfile = false
  render()
}

function onEditProfile () {
  isEditingProfile = true
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
          ${!isEditingProfile ? yo`<button class="btn" onclick=${onEditProfile}>Edit profile</button>` : ''}
          ${!currentProfile || isEditingProfile
            ? renderProfileEditor()
            : renderProfile()
          }

          ${!isEditingProfile
            ? yo`
              <span class="edit-link" onclick=${onEditProfile}>
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
    <div>
      <p>${currentProfile.name}</p>
      <p>${currentProfile.bio}</p>
    </div>
  `
}

function renderProfileEditor () {
  return yo`
    <div>
      <form onsubmit=${onSaveProfile}>
        <label for="name">Name</label>
        <input type="text" name="name" placeholder="Name" value=${currentProfile.name || ''}/>

        <label for="bio">Bio (optional)</label>
        <textarea name="bio" placeholder="Enter a short bio" value=${currentProfile.bio || ''}></textarea>
        <button type="submit" class="btn primary">Save</button>
      </form>
    </div>
  `
}
