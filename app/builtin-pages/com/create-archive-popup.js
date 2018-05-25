/* globals beaker */

import yo from 'yo-yo'
import closeIcon from '../icon/close'

// globals
// =

var resolve
var reject

var currentTemplate

// exported api
// =

export function create (opts = {}) {
  currentTemplate = 'blank'

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

function renderTemplateItem (id, label) {
  var isSelected = currentTemplate === id
  return yo`
    <div class="template-item ${isSelected ? 'selected' : ''}" onclick=${e => onSelectTemplate(id)}>
      <img src=${'beaker://assets/img/templates/' + id + '.png'} />
      <div class="label"><span>${label}</span></div>
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

function onSelectTemplate (id) {
  currentTemplate = id
  update()
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

  resolve({folder: folder[0]})
  destroy()
}

function onClickWrapper (e) {
  if (e.target.id === 'create-archive-popup') {
    destroy()
  }
}

function onSubmit (e) {
  e.preventDefault()
  resolve({template: currentTemplate !== 'blank' ? currentTemplate : false})
  destroy()
}
