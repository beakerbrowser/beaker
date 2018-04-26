/* globals beaker DatArchive */

import yo from 'yo-yo'
import slugify from 'slugify'
import bytes from 'bytes'
import segmentedProgressBar from '../com/segmented-progress-bar'
import APIS from '../../lib/app-perms'

// globals
// =

var numPages = 3
var pages = [renderAppInfoPage, renderLocationPage, renderPermsPage]
var currentPage = 0
var usingCustomName = false
var currentCustomName = ''
var currentAssignedPermissions = null
var targetAppInfo
var replacedAppInfo
var viewError

// main
// =

window.setup = async function setup (opts) {
  try {
    // setup
    targetAppInfo = await getTargetAppInfo(opts.url)

    // configure pages
    if (!targetAppInfo.requestedPermissions) {
      numPages = 2
      pages = [renderAppInfoPage, renderLocationPage]
    }

    // set current name
    if (targetAppInfo.isInstalled && targetAppInfo.name !== targetAppInfo.info.installedNames[0]) {
      usingCustomName = true
      currentCustomName = targetAppInfo.info.installedNames[0]
    } else if (!targetAppInfo.name) {
      usingCustomName = false
    }

    // set current permissions
    if (targetAppInfo.isInstalled) {
      currentAssignedPermissions = targetAppInfo.assignedPermissions
    } else {
      // default to giving the app everything it requested
      currentAssignedPermissions = Object.assign({}, targetAppInfo.requestedPermissions)
    }

    // load current app info
    if (targetAppInfo.name) {
      replacedAppInfo = await getCurrentApp()
    }
  } catch (e) {
    console.error(e)
    viewError = e
  }

  try {
    // render
    renderToPage()
  } catch (e) {
    console.log(e)
  }
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
    beaker.browser.closeModal(null, {
      name: getCurrentName(),
      permissions: currentAssignedPermissions
    })
  } catch (e) {
    beaker.browser.closeModal({
      name: e.name,
      message: e.message || e.toString(),
      internalError: true
    })
  }
}

function onChangeInstallNameOpt (e) {
  usingCustomName = e.target.checked
  renderToPage()
  onChangeName()

  if (usingCustomName) {
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

function onChangePerm (e, api, perm) {
  const cap = currentAssignedPermissions
  if (!cap[api]) cap[api] = []
  if (e.target.checked && !cap[api].includes(perm)) {
    cap[api].push(perm)
  } else if (!e.target.checked && cap[api].includes(perm)) {
    cap[api] = cap[api].filter(p => p !== perm)
  }
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
  const submitDisabled = (currentPage === numPages - 1 && !isReadyToInstall())
  yo.update(document.querySelector('main'), yo`
    <main>
      <div class="modal">
        <div class="modal-inner">
          <div class="install-modal">
            <div class="header">
              <img class="favicon" src="beaker-favicon:${targetAppInfo.url}"/>

              <div>
                <h1 class="title">
                  ${targetAppInfo.title || 'Untitled'}
                </h1>

                <div class="metadata">
                  <span class="author">by ${targetAppInfo.author || 'Anonymous'}</span>
                   -
                  <span class="size">${targetAppInfo.size || ''}</span>
                </div>
              </div>
            </div>

            ${renderPage()}

            <form onsubmit=${onSubmit}>
              <div class="form-actions">
                <button type="button" onclick=${onClickCancel} class="btn" tabindex="4">Cancel</button>
                ${segmentedProgressBar(currentPage, numPages)}
                <button type="submit" class="btn ${currentPage < numPages - 1 ? 'primary' : 'success'}" tabindex="5" disabled=${submitDisabled}>
                  ${currentPage < numPages - 1 ? 'Next' : 'Finish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>`)
}

function renderAppInfoPage () {
  return yo`
    <div>
      <p>${targetAppInfo.description || yo`<em>No description</em>`}</p>
    </div>
  `
}

function renderLocationPage () {
  return yo`
    <div>
      <div class="install-name">
        ${targetAppInfo.name ? yo`
          <div>
            <p>
              This app wants to be installed at <code>app://${targetAppInfo.name}</code>.
            </p>

            <label>
              <input type="checkbox" name="install-name-opt" onchange=${onChangeInstallNameOpt} checked=${usingCustomName} />
                Install at custom location
            </label>

            ${usingCustomName ? yo`
              <div class="custom-input">
                <span class="prefix">app://</span>
                <input type="text" placeholder="news, photos, etc." onchange=${onChangeCustomName} value=${currentCustomName} />
              </div>`
            : ''}
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

function renderPermsPage () {
  let modalHeight = 125
  modalHeight += Object.keys(targetAppInfo.requestedPermissions).length * 85
  beaker.browser.setWindowDimensions({height: modalHeight})
  return yo`
    <div>
      <div class="perms">
        <ul>
          ${Object.keys(targetAppInfo.requestedPermissions).map(renderAPIPerms)}
        </ul>
      </div>
    </div>
  `
}

function renderAPIPerms (api) {
  const apiInfo = APIS[api]
  if (!apiInfo) return ''
  const requestedPerms = targetAppInfo.requestedPermissions[api]
  const assignedPerms = currentAssignedPermissions[api]
  return yo`
    <li>
      <strong>${apiInfo.label}</strong>
      <ul>
        ${requestedPerms.map(perm => yo`
          <li class="perm">
            <label>
              <input
                type="checkbox"
                name="${api}:${perm}"
                checked=${!!(assignedPerms && assignedPerms.includes(perm))}
                onchange=${e => onChangePerm(e, api, perm)}/>
              ${apiInfo.perms[perm]}
            </label>
          </li>
        `)}
      </ul>
    </li>
  `
}

// helpers
// =

function isReadyToInstall () {
  return !!getCurrentName()
}

function getCurrentName () {
  if (!usingCustomName) {
    if (targetAppInfo.name) {
      return targetAppInfo.name
    } else {
      targetAppInfo.name = '' // getRandomName() TODO
      return targetAppInfo.name
    }
  }
  return currentCustomName
}

async function getTargetAppInfo (url) {
  const a = new DatArchive(url)

  // read manifest
  try {
    var manifest = JSON.parse(await a.readFile('/dat.json'))
  } catch (e) {
    manifest = {}
  }
  manifest.app = manifest.app || {}

  // read install state
  const info = await a.getInfo()
  const isInstalled = info.installedNames.length > 0
  const assignedPermissions = isInstalled
    ? await beaker.sitedata.getAppPermissions(`app://${info.installedNames[0]}`)
    : {}

  return {
    url,
    info,
    isInstalled,
    title: toString(manifest.title),
    description: toString(manifest.description),
    author: toAuthorName(manifest.author),
    size: toByteSize(info.size),
    name: toSlug(manifest.app.name),
    requestedPermissions: toPermsObject(manifest.app.permissions),
    assignedPermissions: assignedPermissions || {}
  }
}

async function getCurrentApp () {
  var binding = await beaker.apps.get(0, getCurrentName())
  if (!binding) return null
  if (binding.url === targetAppInfo.url) return null
  if (binding.url.startsWith('dat://')) {
    let a = new DatArchive(binding.url)
    return a.getInfo()
  }
  return {url: binding.url}
}

function toString (v) {
  return v && typeof v === 'string' ? v : false
}

function toByteSize (v) {
  if (typeof v === 'number' && v >= 0) {
    return bytes(v)
  }
  return ''
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
