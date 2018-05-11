import yo from 'yo-yo'
import * as dedicatedPeers from '../../../lib/fg/dedicated-peers'

// globals
// =

var accounts
var formAction = false
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
var errors = null

// exported api
// =

export default function renderDedicatedPeers (dedicatedPeerAccounts) {
  if (!accounts) {
    loadAccounts()
  }

  return yo`
    <div class="view">
      <div class="section">
        <h2 id="dedicated-peers" class="subtitle-heading">Dedicated Peers</h2>
        <p>Dedicated peers keep your Dat data online, even when your computer is off.</p>
        
        ${accounts ? accounts.map(renderPeer) : ''}

        ${formAction
          ? renderForm()
          : yo`
            <div>
              <button class="btn transparent" onclick=${e => onChangeAddPeerAction(e, 'register')}><i class="fa fa-plus"></i> Add</button>
            </div>`}
      </div>
    </div>`
}

// rendering
// =

function renderPeer ({origin, username}) {
  return yo`
    <div class="peer">
      <a class="name" href=${origin} target="_blank">${origin}</a>
      <span class="user">${username}</span>
      <span>
        <button class="btn transparent"><i class="fa fa-pencil"></i> Edit</button>
        <button class="btn transparent" onclick=${e => onRemoveAccount(origin, username)}><i class="fa fa-trash"></i></button>
      </span>
    </div>`
}

function renderForm () {
  if (!formAction) return ''
  return yo`
    <div class="add-peer-form">
      <p class="action-choice">
        <label><input type="radio" name="action" onchange=${onChangeAddPeerAction} checked=${formAction === 'register'} value="register" /> Register with Hashbase</label>
        <label><input type="radio" name="action" onchange=${onChangeAddPeerAction} checked=${formAction === 'signin'} value="signin" /> Sign into an existing account</label>
      </p>
      ${formAction === 'register' ? renderRegisterForm() : renderSigninForm()}
    </div>`
}

function renderRegisterForm () {
  return yo`
    <form class="form-layout">
      <div>
        ${registerFields.map(renderInput)}
        <div class="form-actions">
          <button class="btn primary">Create your account</button>
        </div>
      </div>
    </form>`
}

function renderSigninForm () {
  return yo`
    <form class="form-layout" onsubmit=${onSubmitSignin}>
      <div>
        ${errors ? yo`<div class="message error">${errors.message}</div>` : ''}
        ${signinFields.map(renderInput)}
        <div class="form-actions">
          <button class="btn primary" type="submit">Sign in</button>
        </div>
      </div>
    </form>`
}

function renderInput (field, i) {
  var {name, label, type, value} = field
  var error = errors && errors.details && errors.details[name]
  type = type || 'text'
  return yo`
    <div class="field">
      <label for=${name}>${label}</label>
      <input
        class=${!!error ? 'error' : ''}
        type=${type}
        id=${name}
        name=${name}
        value=${value}
        ${i === 0 ? 'autofocus' : ''}
        onchange=${e => onChangeInput(e, field)} />
      ${error ? yo`<div class="help-text error">${error.msg}</div>` : ''}
    </div>`
}

// internal methods
// =

function updatePage () {
  yo.update(document.querySelector('.view'), renderDedicatedPeers())
}

async function loadAccounts () {
  accounts = await dedicatedPeers.listAccounts()
  formAction = (accounts.length === 0) ? 'register' : false
  updatePage()
}

function onChangeAddPeerAction (e, value) {
  formAction = value || e.currentTarget.value
  errors = null
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

async function onSubmitSignin (e) {
  e.preventDefault()

  // attempt signin
  errors = null
  var res
  var origin = signinFields[0].value
  var username = signinFields[1].value
  var password = signinFields[2].value
  try {
    res = await beaker.services.login(origin, username, password)
    if (!res.success) {
      if (res.body && typeof res.body.message === 'string') {
        errors = res.body
      } else if (typeof res.body === 'string' && (res.headers['content-type'] || '').indexOf('text/plain') !== -1) {
        errors = {message: res.body}
      } else {
        errors = {message: 'There were errors in your submission'}
      }
    }
  } catch (e) {
    console.error(e)
    errors = {message: e.toString()}
  }

  // save
  if (res && res.success) {
    await beaker.services.addAccount(origin, username, password)
    loadAccounts()
  } else {
    updatePage()
  }
}

async function onRemoveAccount (origin, username) {
  if (!confirm('Remove this account?')) {
    return
  }

  await beaker.services.logout(origin, username)
  await beaker.services.removeAccount(origin, username)
  loadAccounts()
}

