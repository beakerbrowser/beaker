const yo = require('yo-yo')

// globals
// =

var requester
var profiles
var currentView = 'list'
var views = {
  list: renderListView,
  create: renderCreateView,
  confirm: renderConfirmView
}
setup()

// main api
// =

// this method gets called by the background process after load
async function setup () {
  // read session information
  var req = await UserSession.getSessionRequest(location.pathname.slice(1))
  console.debug('setup()', req)
  requester = req.requester

  // load all profiles
  profiles = await beaker.profiles.list()
  profiles = profiles.filter(p => p.id !== 0) // filter out profile 0, the default profile
  console.debug('profiles', profiles)

  // render
  update()
}

function setView (view) {
  currentView = view
  update()
}

async function createProfile (formData) {
  var display_name = formData.get('display_name')
  var label = formData.get('label')
  var avatarFile = formData.get('avatar')

  // create archive
  // TODO
  var profile = new DatUserProfile(url)

  // write avatar file
  var avatar
  if (avatarFile) {
    // TODO
    avatar = '/avatar.??'
  }

  // write profile json
  await profile.setProfileJson({
    display_name,
    avatar
  })
}

function createSession () {
  UserSession.createSession({
    returnURL: requester.url
  })
}

// views
// =

function update () {
  yo.update(document.querySelector('main'), yo`
    <main>${views[currentView]()}</main>
  `)
}

function renderListView () {
  return yo`
    <div>
      <h1>Sign in</h1>
      <div class="profiles">
        ${profiles.map(renderProfile)}
        <div class="profile new" onclick=${() => setView('create')}>
          <div class="icon"><i class="fa fa-plus"></i></div>
          <div>New Profile</div>
        </div>
      </div>
    </div>
  `
}

function renderCreateView () {
  return yo`
    <div>
      <h1>Sign in: new profile</h1>
      <div class="new-profile">
        <form>
          <div>
            <label>Avatar</label>
            <input type="file" name="avatar" accept="image/*" />
          </div>
          <div>
            <label>Display name</label>
            <input type="text" name="display_name" placeholder="Display name" />
          </div>
          <div>
            <label>Label</label>
            <input type="text" name="label" placeholder="Label" />
          </div>
          <div>
            <a class="link" onclick=${()=>setView('list')}><i class="fa fa-angle-left"></i> Back</a>
            <button class="btn primary">Create</button>
          </div>
        </div>
      </div>
    </div>
  `
}

function renderConfirmView () {
  // TODO
  return 'confirm TODO'
}

// components
// =

function renderProfile (profile) {
  return yo`
    <div class="profile">
      <div><img src="${join(profile.url, profile.avatar)}" /></div>
      <div>${profile.display_name || yo`<em>Unnamed</em>`}</div>
      <div>${profile.label}</div>
    </div>
  `
}

// helpers
// =

function join (left, right) {
  left = left || ''
  right = right || ''
  if (left.endsWith('/') && right.startsWith('/')) {
    return left + right.slice(1)
  }
  if (!left.endsWith('/') && !right.startsWith('/')) {
    return left + '/' + right
  }
  return left + right
}