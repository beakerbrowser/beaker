/* globals beaker */

import yo from 'yo-yo'
import closeIcon from '../icon/close'
import * as contextMenu from './context-menu'
import * as toast from './toast'

// globals
// =

var resolve
var reject

var currentTemplate
var userTemplates

// exported api
// =

export function create (opts = {}) {
  currentTemplate = 'blank'
  userTemplates = []

  // load user templates
  beaker.archives.listTemplates().then(t => {
    userTemplates = t
    update()
  })

  // render interface
  var popup = render()
  document.body.appendChild(popup)
  document.addEventListener('keyup', onKeyUp)

  // return promise
  return new Promise((_resolve, _reject) => {
    resolve = _resolve
    reject = _reject
  })
}

export function destroy () {
  var popup = document.getElementById('create-archive-popup')
  document.body.removeChild(popup)
  document.removeEventListener('keyup', onKeyUp)
  reject()
}

// rendering
// =

function update () {
  yo.update(document.getElementById('create-archive-popup'), render())
}

function render () {
  return yo`
    <div id="create-archive-popup" class="popup-wrapper" onclick=${onClickWrapper}>
      <form class="popup-inner" onsubmit=${onSubmit}>
        <div class="head">
          <span class="title">
            Choose a template
          </span>

          <span title="Cancel" onclick=${destroy} class="close-btn square">
            ${closeIcon()}
          </span>
        </div>

        <div class="body">
          <div class="templates-grid">
            ${renderTemplateItem('blank', 'Blank')}
            ${renderTemplateItem('website', 'Website')}
            ${userTemplates.map(({url, title}) => renderTemplateItem(url, title, true))}
          </div>

          <div class="actions">
            <button type="button" class="btn left" onclick=${onImportFolder}>Import from folder</button>
            <button type="button" class="btn" onclick=${destroy}>Cancel</button>
            <button type="submit" class="btn primary">Next</button>
          </div>
        </div>
      </form>
    </div>
  `
}

function renderTemplateItem (url, title, isUserTemplate) {
  var isSelected = currentTemplate === url
  var screenshotUrl = isUserTemplate
    ? `beaker://templates/screenshot/${url}`
    : `beaker://assets/img/templates/${url}.png`
  return yo`
    <div
      class="template-item ${isSelected ? 'selected' : ''}"
      onclick=${e => onSelectTemplate(url)}
      ondblclick=${e => onSelectTemplate(url, true)}
      oncontextmenu=${e => onContextmenuTemplate(e, {url, title})}
    >
      <img src=${screenshotUrl} />
      <div class="label"><span>${title}</span></div>
    </div>`
}

// event handlers
// =

function onKeyUp (e) {
  e.preventDefault()
  e.stopPropagation()

  if (e.keyCode === 27) {
    destroy()
  }
}

function onSelectTemplate (url, submitNow = false) {
  currentTemplate = url
  update()
  if (submitNow) {
    onSubmit()
  }
}

function onClickWrapper (e) {
  if (e.target.id === 'create-archive-popup') {
    destroy()
  }
}

async function onContextmenuTemplate (e, template) {
  e.preventDefault()
  var {url} = template
  
  // select the template
  currentTemplate = url
  update()

  if (url !== 'blank' && url !== 'website') {
    // show the context menu
    const items = [
      {icon: 'trash', label: 'Delete template', click: () => onClickDeleteTemplate(template) }
    ]
    await contextMenu.create({x: e.clientX, y: e.clientY, items})
  }
}

async function onClickDeleteTemplate (template) {
  // confirm
  if (!confirm(`Remove ${template.title}?`)) {
    return
  }
  // remove
  await beaker.archives.removeTemplate(template.url)
  // notify and rerender
  currentTemplate = 'blank'
  userTemplates = await beaker.archives.listTemplates()
  toast.create(`${template.title} has been removed from your templates.`, '', 3e3)
  update()
}

async function onSubmit (e) {
  if (e) e.preventDefault()

  var template = currentTemplate !== 'blank' ? currentTemplate : false
  // TODO -- if using a dat template, need to decide whether to fork from dat:// or an internal snapshot -prf
  var archive
  if (template && template.startsWith('dat://')) {
    archive = await DatArchive.fork(template, {prompt: false})
  } else {
    console.log('creating', template)
    archive = await DatArchive.create({template, prompt: false})
  }
  resolve({archive})
  destroy()
}

async function onImportFolder (e) {
  e.preventDefault()
  e.stopPropagation()
 
  // ask user for folder
  const folder = await beaker.browser.showOpenDialog({
    title: 'Select folder',
    buttonLabel: 'Import folder',
    properties: ['openDirectory']
  })
  if (!folder || !folder.length) return
 
  // create the dat
  const archive = await DatArchive.create({prompt: false})
  await beaker.archives.setLocalSyncPath(archive.url, folder, {syncFolderToArchive: true})

  resolve({archive})
  destroy()
}
