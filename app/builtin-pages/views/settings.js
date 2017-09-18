/* globals beaker Image */

import yo from 'yo-yo'
import ColorThief from '../../lib/fg/color-thief'
import {shortenHash} from '../../lib/strings'
import {niceDate} from '../../lib/time'
import renderSidebar from '../com/sidebar'
import {create as createEditAppPopup} from '../com/edit-app-popup'

const colorThief = new ColorThief()

// globals
// =

var settings
var browserInfo
var browserEvents
var defaultProtocolSettings
var applications
var activeSection = ''

// TODO(bgimg) disabled for now -prf
// var bgImages = [
//   {path: '1.jpg', thumbnailPath: '1-thumbnail.jpg',},
//   {path: '2.jpg', thumbnailPath: '2-thumbnail.jpg', selected: true},
//   {path: '3.jpg', thumbnailPath: '3-thumbnail.jpg'},
//   {path: '4.jpg', thumbnailPath: '4-thumbnail.jpg'},
//   {path: '5.jpg', thumbnailPath: '5-thumbnail.jpg'},
//   {path: '6.jpg', thumbnailPath: '6-thumbnail.jpg'},
//   {path: '7.jpg', thumbnailPath: '7-thumbnail.jpg'},
//   {path: '8.jpg', thumbnailPath: '8-thumbnail.jpg'},
//   {path: '9.jpg', thumbnailPath: '9-thumbnail.jpg'},
//   {path: '10.jpg', thumbnailPath: '10-thumbnail.jpg'},
//   {path: '11.jpg', thumbnailPath: '11-thumbnail.jpg'}]

// main
// =

setup()
async function setup () {
  renderToPage()

  // wire up events
  browserEvents = beaker.browser.createEventsStream()
  browserEvents.addEventListener('updater-state-changed', onUpdaterStateChanged)
  browserEvents.addEventListener('updater-error', onUpdaterError)

  // fetch data
  browserInfo = await beaker.browser.getInfo()
  settings = await beaker.browser.getSettings()
  defaultProtocolSettings = await beaker.browser.getDefaultProtocolSettings()
  applications = await beaker.apps.list(0)

  renderToPage()
}

// rendering
// =

function renderToPage () {
  // only render if this page is active
  if (!browserInfo) {
    yo.update(document.querySelector('.settings-wrapper'), yo`<div class="pane" id="el-content">
      <div class="settings-wrapper builtin-wrapper">
        ${renderSidebar('settings')}
      </div>
    </div>`)
    return
  }

  yo.update(document.querySelector('.settings-wrapper'), yo`<div class="pane" id="el-content">
    <div class="settings-wrapper builtin-wrapper">
      ${renderSidebar('settings')}

      <div>
        <div class="builtin-sidebar">
          <h1>Settings</h1>
          <p class="builtin-blurb">Manage Beaker${"'"}s appearance and preferences.</p>

          <div class="section">
            <div class="nav-item ${activeSection === 'auto-updater' ? 'active' : ''}" onclick=${onUpdateActiveSection} data-section="auto-updater">
              Auto-updater
            </div>
            <div class="nav-item ${activeSection === 'protocol-settings' ? 'active' : ''}" onclick=${onUpdateActiveSection} data-section="protocol-settings">
              Protocol settings
            </div>
            <div class="nav-item ${activeSection === 'applications' ? 'active' : ''}" onclick=${onUpdateActiveSection} data-section="applications">
              Applications
            </div>
            <div class="nav-item ${activeSection === 'info' ? 'active' : ''}" onclick=${onUpdateActiveSection} data-section="info">
              Information & Help
            </div>
          </div>
        </div>

        <div class="builtin-main">
          <h2 id="auto-updater" class="ll-heading">Auto-updater</h2>
          ${renderAutoUpdater()}

          <h2 id="protocol-settings" class="ll-heading">Protocol settings</h2>
          ${renderProtocolSettings()}

          <h2 id="applications" class="ll-heading">Applications</h2>
          ${renderApplications()}

          <h2 id="info" class="ll-heading">Beaker information</h2>
          <ul class="settings-section">
            <li>Version: ${browserInfo.version} Electron: ${browserInfo.electronVersion} - Chromium: ${browserInfo.chromiumVersion} - Node: ${browserInfo.nodeVersion}</li>
            <li>User data: ${browserInfo.paths.userData}</li>
          </ul>

          <h2 class="ll-heading">Help</h2>
          ${renderHelp()}
        </div>
      </div>
    </div>
  </div>`)
}

function renderProtocolSettings () {
  function register (protocol) {
    return () => {
      // update and optimistically render
      beaker.browser.setAsDefaultProtocolClient(protocol)
      defaultProtocolSettings[protocol] = true
      renderToPage()
    }
  }
  var registered = Object.keys(defaultProtocolSettings).filter(k => defaultProtocolSettings[k])
  var unregistered = Object.keys(defaultProtocolSettings).filter(k => !defaultProtocolSettings[k])

  return yo`<div class="settings-section protocols">
      ${registered.length
        ? yo`<div>Beaker is the default browser for <strong>${registered.join(', ')}</strong>.</div>`
        : ''}
      ${unregistered.map(proto => yo`
        <div>
          <strong>${proto}</strong>
          <a onclick=${register(proto)}>
            Make default
            <i class="fa fa-share"></i>
          </a>
        </div>`)}
      </div>`
}

function renderApplications () {
  return yo`<div class="settings-section applications">
      <table>
        ${applications.map(app => yo`
          <tr>
            <td><a href=${'app://' + app.name} target="_blank">${app.name}</a></td>
            <td class="current-value"><a href=${app.url} target="_blank">${app.url}</a></td>
            <td class="date">${niceDate(app.updatedAt)}</td>
            <td class="edit-ctrl"><a href="#" onclick=${e => onClickEditApp(e, app)}>edit</a></td>
            <td class="remove-ctrl"><a href="#" onclick=${e => onClickRemoveApp(e, app)}>remove</a></td>
          </tr>
        `)}
      </table>
      <div class="create-app">
        <a href="#" onclick=${onClickEditApp}>+ New app</a>
      </div>
    </div>`
}

function renderAutoUpdater () {
  if (!browserInfo.updater.isBrowserUpdatesSupported) {
    return yo`<div class="settings-section">
      <div>Sorry! Beaker auto-updates are only supported on the production build for MacOS and Windows.
      You will need to build new versions of Beaker from source.</div>
    </div>`
  }

  switch (browserInfo.updater.state) {
    default:
    case 'idle':
      return yo`<div class="settings-section">
        <button class="btn btn-default" onclick=${onClickCheckUpdates}>Check for updates</button>
        <span class="version-info">
          ${browserInfo.updater.error
            ? yo`<span><span class="icon icon-cancel"></span> ${browserInfo.updater.error}</span>`
            : yo`<span>
              <span class="icon icon-check"></span>
              <strong>Beaker v${browserInfo.version}</strong> is up-to-date
            </span>`
          }
          ${renderAutoUpdateCheckbox()}
        </span>
      </div>`

    case 'checking':
      return yo`<div class="settings-section">
        <button class="btn" disabled>Checking for updates</button>
        <span class="version-info">
          <div class="spinner"></div>
          Checking for updates to Beaker...
          ${renderAutoUpdateCheckbox()}
        </span>
      </div>`

    case 'downloading':
      return yo`<div class="settings-section">
        <button class="btn" disabled>Updating</button>
        <span class="version-info">
          <div class="spinner"></div>
          Downloading the latest version of Beaker...
          ${renderAutoUpdateCheckbox()}
        </span>
      </div>`

    case 'downloaded':
      return yo`<div class="settings-section">
        <button class="btn" onclick=${onClickRestart}>Restart now</button>
        <span class="version-info">
          <span class="icon icon-up-circled"></span>
          <strong>New version available.</strong> Restart Beaker to install.
          ${renderAutoUpdateCheckbox()}
        </span>
      </div>`
  }
}

function renderAutoUpdateCheckbox () {
  return yo`<label>
    <input type="checkbox" checked=${isAutoUpdateEnabled()} onclick=${onToggleAutoUpdate} /> Check for updates automatically
  </label>`
}

// TODO(bgimg) disabled for now -prf
// function renderStartPageSettings () {
//   return yo`
//   <div class="settings-section start-page">
//     <div class="bg-images">
//       <div width="90" height="60" class="bg-image-container add">
//         <input onchange=${onUpdateStartPageBackgroundImage} name="start-background-image" type="file" accept="image/*"/>
//         +
//       </div>
//       ${bgImages.map(img => {
//         return yo`
//           <div onclick=${() => onUpdateStartPageBackgroundImage(`assets/img/start/${img.path}`)} class="bg-image-container ${img.selected ? 'selected' : ''}">
//             <img class="bg-image" width="90" height="60" src="beaker://start/background-image-default/${img.thumbnailPath}"/>
//           </div>`
//       })}
//     </div>
//   `
// }

function renderHelp () {
  return yo`
    <ul class="settings-section help">
      <li><a href="https://beakerbrowser.com/docs/using-beaker">Take a tour of Beaker</a></li>
      <li><a href="https://beakerbrowser.com/docs">Read the documentation</a></li>
      <li><a href="https://github.com/beakerbrowser/beaker/issues">Report an issue</a></li>
    </ul>
  `
}

// event handlers
// =

function onUpdateActiveSection (e) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'))
  e.target.classList.add('active')

  activeSection = e.target.dataset.section
  document.querySelector(`#${activeSection}`).scrollIntoView()
}

function onClickCheckUpdates () {
  // trigger check
  beaker.browser.checkForUpdates()
}

function onToggleAutoUpdate () {
  settings.auto_update_enabled = isAutoUpdateEnabled() ? 0 : 1
  renderToPage()
  beaker.browser.setSetting('auto_update_enabled', settings.auto_update_enabled)
}

function onClickRestart () {
  beaker.browser.restartBrowser()
}

function onUpdaterStateChanged (state) {
  if (!browserInfo) { return }
  // render new state
  browserInfo.updater.state = state
  browserInfo.updater.error = false
  renderToPage()
}

async function onClickEditApp (e, app) {
  e.preventDefault()
  var newApp = await createEditAppPopup(app)
  if (app && app.name !== newApp.name) {
    await beaker.apps.unbind(0, app.name)
  }
  await beaker.apps.bind(0, newApp.name, newApp.url)
  applications = await beaker.apps.list(0)
  renderToPage()
}

async function onClickRemoveApp (e, app) {
  e.preventDefault()
  if (!confirm(`Remove the "${app.name}" application?`)) {
    return
  }

  await beaker.apps.unbind(0, app.name)
  applications = await beaker.apps.list(0)
  renderToPage()
}

function onUpdateStartPageTheme (e) {
  var theme = e.target.value
  settings.start_page_background_image = theme
  beaker.browser.setSetting('start_page_background_image', theme)
  renderToPage()
}

async function onUpdateStartPageBackgroundImage (srcPath) {
  var isUpload = this && this.files
  if (isUpload) srcPath = this.files[0].path

  // write the image to start_background_image
  var appendDir = isUpload ? false : true
  await beaker.browser.setStartPageBackgroundImage(srcPath, appendDir)

  // TODO: we might not need this. disabling for now -tbv
  // is the image light or dark?
  // if (isUpload) await setStartPageTheme()
  // if (true) await setStartPageTheme()
  // else {
  //   settings.start_page_background_image = ''
  //   await beaker.browser.setSetting('start_page_background_image', '')
  // }
  renderToPage()
}

function onUpdaterError (err) {
  if (!browserInfo) { return }
  // render new state
  browserInfo.updater.error = err
  renderToPage()
}

// internal methods
// =

function isAutoUpdateEnabled () {
  return +settings.auto_update_enabled === 1
}

function setStartPageTheme () {
  function getBrightness (r, g, b) {
    return Math.sqrt(
      0.241 * Math.pow(r, 2) +
      0.691 * Math.pow(g, 2) +
      0.068 * Math.pow(b, 2))
  }

  return new Promise(resolve => {
    var img = new Image()
    img.setAttribute('crossOrigin', 'anonymous')
    img.onload = e => {
      var palette = colorThief.getPalette(img, 10)
      var totalBrightness = 0

      palette.forEach(color => {
        totalBrightness += getBrightness(...color)
      })

      var brightness = totalBrightness / palette.length

      var theme = brightness < 150 ? 'dark' : 'light'
      beaker.browser.setSetting('start_page_background_image', theme)
      settings.start_page_background_image = theme
      resolve()
    }
    img.onerror = resolve
    img.src = 'beaker://start/background-image'
  })
}
