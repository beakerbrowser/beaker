import yo from 'yo-yo'
import slugify from 'slugify'
import segmentedProgressBar from '../com/segmented-progress-bar'

// globals
// =

const APIS = {
  bookmarks: {
    label: 'Bookmarks',
    perms: {
      read: 'Read all of your bookmarks.',
      manage: 'Manage your private bookmarks.',
      publish: 'Manage your public bookmarks.'
    }
  },
  profiles: {
    label: 'Your Profile',
    perms: {
      read: 'Read your profile details and who you follow.',
      publish: 'Edit your profile details and who you follow.'
    }
  },
  timeline: {
    label: 'Timeline',
    perms: {
      read: 'Read your timeline.',
      publish: 'Publish to your timeline.'
    }
  }
}

var numPages = 3
var pages = [renderPage1, renderPage2, renderPage3]
var currentPage = 0
var currentNameOpt = 'default'
var currentCustomName = ''
var targetAppInfo
var replacedAppInfo
var viewError

// main
// =

window.setup = async function setup (opts) {
  try {
    // setup
    targetAppInfo = await getTargetAppInfo(opts.url)

    // configure
    if (!targetAppInfo.permissions) {
      numPages = 2
      pages = [renderPage1, renderPage3]
    }
    if (targetAppInfo.name) {
      replacedAppInfo = await getCurrentApp()
    } else {
      currentNameOpt = 'custom'
    }
  } catch (e) {
    console.error(e)
    viewError = e
  }

  // render
  renderToPage()
}

// events
// =

function onClickCancel (e) {
  e.preventDefault()
  beaker.browser.closeModal()
}

async function onSubmit (e) {
  e.preventDefault()

  currentPage++
  if (currentPage < numPages) {
    return renderToPage()
  }

  try {
    // TODO
    beaker.browser.closeModal()
  } catch (e) {
    beaker.browser.closeModal({
      name: e.name,
      message: e.message || e.toString(),
      internalError: true
    })
  }
}

function onChangeInstallNameOpt (e) {
  currentNameOpt = e.target.value
  renderToPage()
  onChangeName()

  if (currentNameOpt === 'custom') {
    document.querySelector('.custom-input input').focus()
  }
}

function onChangeCustomName (e) {
  currentCustomName = slugify(e.target.value)
  renderToPage()
  onChangeName()
}

async function onChangeName () {
  replacedAppInfo = await getCurrentApp()
  renderToPage()
}

// rendering
// =

function renderToPage () {
  if (viewError) {
    return yo.update(document.querySelector('main'), yo`<main>
      <div class="modal">
        <div class="modal-inner">
          <div class="install-modal">
            <h1 class="title">Error</h1>
            <pre>${viewError.toString()}</pre>
          </div>
        </div>
      </div>
    </main>`)
  }

  const renderPage = pages[currentPage]
  yo.update(document.querySelector('main'), yo`<main>
    <div class="modal">
      <div class="modal-inner">
        <div class="install-modal">
          <h1 class="title">Install ${targetAppInfo.name ? `app://${targetAppInfo.name}` : 'this app'}</h1>

          ${renderPage()}

          <form onsubmit=${onSubmit}>
            <div class="form-actions">
              <button type="button" onclick=${onClickCancel} class="btn cancel" tabindex="4">Cancel</button>
              ${segmentedProgressBar(currentPage, numPages)}
              <button type="submit" class="btn primary" tabindex="5" disabled=${!isReadyToInstall()}>
                ${currentPage < numPages - 1 ? 'Next' : 'Finish'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </main>`)
}

function renderPage1 () {
  return yo`
    <div>
      <table class="app-info">
        <tr><td>Title:</td><td>${targetAppInfo.title}</td></tr>
        <tr><td>Description:</td><td>${targetAppInfo.description}</td></tr>
        <tr><td>Author:</td><td>${targetAppInfo.author}</td></tr>
      </table>
    </div>
  `
}

function renderPage2 () {
  return yo`
    <div>
      <p class="help-text">
        Are these permissions ok?
      </p>

      <div class="perms">
        <ul>
          ${Object.keys(targetAppInfo.permissions).map(api => 
            renderPerm(api, targetAppInfo.permissions[api])
          )}
        </ul>
      </div>
    </div>
  `
}

function renderPerm (api, perms) {
  const apiInfo = APIS[api]
  if (!apiInfo) return ''
  return yo`<li>
    <strong>${apiInfo.label}</strong>
    <ul>
      ${perms.map(perm => yo`<li>${apiInfo.perms[perm]}</li>`)}
    </ul>
  </li>`
}

function renderPage3 () {
  return yo`
    <div>
      <p class="help-text">
        Where would you like to install?
      </p>

      <div class="install-name">
        ${targetAppInfo.name ?
          yo`<label><input type="radio" name="install-name-opt" value="default" onchange=${onChangeInstallNameOpt} checked=${currentNameOpt === 'default'} /> Install at <code>app://${targetAppInfo.name}</code> <span class="muted">(default)</span></label>`
          : ''}
        <label><input type="radio" name="install-name-opt" value="custom" onchange=${onChangeInstallNameOpt} checked=${currentNameOpt === 'custom'} /> Install at custom location</label>
        ${currentNameOpt === 'custom' ?
          yo`<div class="custom-input">
            <span>app://</span>
            <input type="text" placeholder="news, my-pics-app, etc." onchange=${onChangeCustomName} value=${currentCustomName} />
          </div>`
          : ''}
      </div>

      ${replacedAppInfo ?
        yo`<p class="footnote">
          This will replace the current application at <code>app://${getCurrentName()}</code>
          ${replacedAppInfo.title
            ? yo`<span>called <span class="nobreak">"${replacedAppInfo.title}"</span></span>`
            : yo`<span>(${replacedAppInfo.url})</span>`}
        </p>`
      : ''}
    </div>
  `
}

// helpers
// =

function isReadyToInstall () {
  return !!getCurrentName()
}

function getCurrentName () {
  if (currentNameOpt === 'default') {
    return targetAppInfo.name
  }
  return currentCustomName
}

async function getTargetAppInfo (url) {
  var a = new DatArchive(url)
  try {
    var manifest = JSON.parse(await a.readFile('/dat.json'))
  } catch (e) {
    manifest = {}
  }
  manifest.app = manifest.app || {}
  return {
    url,
    title: toString(manifest.title),
    description: toString(manifest.description),
    author: toAuthorName(manifest.author),
    name: toSlug(manifest.app.name),
    permissions: toPermsObject(manifest.app.permissions)
  }
}

async function getCurrentApp () {
  var binding = await beaker.apps.get(0, getCurrentName())
  if (!binding) return null
  if (binding.url.startsWith('dat://')) {
    let a = new DatArchive(binding.url)
    return a.getInfo()
  }
  return {url: binding.url}
}

function toString (v) {
  return v && typeof v === 'string' ? v : false
}

function toSlug (v) {
  v = toString(v)
  return v ? slugify(v) : false
}

function toPermsObject (v) {
  if (!v) return false
  if (typeof v !== 'object' || Array.isArray(v)) {
    return false
  }
  for (var k in v) {
    v[k] = toArrayOfStrings(v[k])
    if (!v[k] || !v[k].length) delete v[k]
  }
  if (Object.keys(v).length === 0) {
    return false
  }
  return v
}

function toArrayOfStrings (v) {
  if (!v) return false
  v = Array.isArray(v) ? v : [v]
  return v.filter(item => typeof item === 'string')
}

function toAuthorName (v) {
  if (!v) return false
  if (v.name) return toString(v.name)
  return toString(v)
}