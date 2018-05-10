import yo from 'yo-yo'

// globals
// =

var formAction = ''
var registerFields = [
  {name: 'username', label: 'Username', value: ''},
  {name: 'email', label: 'Email address', value: ''},
  {name: 'password', label: 'Password', value: '', type: 'password'},
  {name: 'passwordConfirm', label: 'Confirm password', value: '', type: 'password'}
]
var signinFields = [
  {name: 'service', label: 'Service', value: 'hashbase.io'},
  {name: 'username', label: 'Username', value: ''},
  {name: 'password', label: 'Password', value: '', type: 'password'},
]

// exported api
// =

export default function renderDedicatedPeers () {
  return yo`
    <div class="view">
      <div class="section">
        <h2 id="dedicated-peers" class="subtitle-heading">Dedicated Peers</h2>
        <p>Dedicated peers keep your Dat data online, even when your computer is off.</p>
        
        ${renderPeer({name: 'hashbase.io', user: 'pfrazee'})}
        ${renderPeer({name: 'paulfrazee.com', user: 'admin'})}

        ${formAction
          ? renderForm()
          : yo`
            <div>
              <button class="btn transparent" onclick=${e => onChangeAddPeerAction(e, 'register')}><i class="fa fa-plus"></i> Add</button>
            </div>`}
        
        ${''/*<p>
          <a href=${URL_HASHBASE_SIGNUP} target="_blank" title="Hashbase.io">Sign up at Hashbase.io</a>
          or read our <a href=${URL_SELF_HOSTING_GUIDE} title="Self-hosting guide" target="_blank">self-hosting guide</a> (advanced).
        </p>*/}
      </div>
      ${''/*<div class="section">
        <h2 class="subtitle-heading">Advanced users</h2>
        <p>
          You can run your own dedicated peer using <a href="https://github.com/beakerbrowser/homebase" target="_blank" title="Homebase">Homebase</a>.
        </p>
      </div>*/}
    </div>`
}

// rendering
// =

function renderPeer ({name, user}) {
  return yo`
    <div class="peer">
      <a class="name" href=${`https://${name}`} target="_blank">${name}</a>
      <span class="user">${user}</span>
      <span>
        <button class="btn transparent"><i class="fa fa-pencil"></i> Edit</button>
        <button class="btn transparent"><i class="fa fa-trash"></i></button>
      </span>
    </div>`
}

function renderForm () {
  if (!formAction) return ''
  return yo`
    <form class="add-peer-form">
      <p class="action-choice">
        <label><input type="radio" name="action" onchange=${onChangeAddPeerAction} checked=${formAction === 'register'} value="register" /> Register with Hashbase</label>
        <label><input type="radio" name="action" onchange=${onChangeAddPeerAction} checked=${formAction === 'signin'} value="signin" /> Sign into an existing account</label>
      </p>
      ${formAction === 'register' ? renderRegisterForm() : renderSigninForm()}
    </form>`
}

function renderRegisterForm () {
  return yo`
    <div class="form-layout">
      <div>
        ${registerFields.map(renderInput)}
        <div class="form-actions">
          <button class="btn primary">Create your account</button>
        </div>
      </div>
    </div>`
}


function renderSigninForm () {
  return yo`
    <div class="form-layout">
      <div>
        ${signinFields.map(renderInput)}
        <div class="form-actions">
          <button class="btn primary">Sign in</button>
        </div>
      </div>
    </div>`
}

function renderInput (field, i) {
  var {name, label, type, value} = field
  type = type || 'text'
  return yo`
    <div class="field">
      <label for=${name}>${label}</label>
      <input
        type=${type}
        id=${name}
        name=${name}
        value=${value}
        ${i === 0 ? 'autofocus' : ''}
        onchange=${e => onChangeInput(e, field)} />
    </div>`
}

// internal methods
// =

function updatePage () {
  yo.update(document.querySelector('.view'), renderDedicatedPeers())
}

function onChangeAddPeerAction (e, value) {
  formAction = value || e.currentTarget.value
  updatePage()

  // highlight first field
  if (formAction == 'register') {
    document.querySelector('input[name=username]').focus()
  } else {
    document.querySelector('input[name=service]').select()
  }
}

function onChangeInput (e, field) {
  field.value = e.currentTarget.value
}
