import yo from 'yo-yo'
import * as contextMenu from '../context-menu'
import toggleable2 from '../toggleable2'
import * as toast from '../toast'
import {writeToClipboard, emit} from '../../../lib/event-handlers'

// rendering
// =

export function render ({models}) {
  return yo`
    <div class="editor-tabs">
      ${models.map(model => renderTab(model))}
      <div class="tab new-file" onclick=${e => emit('editor-new-model')}><span class="fas fa-plus"></span></div>
      <div class="unused-space" ondragover=${(e) => onTabDragOver(e)} ondrop=${(e) => onTabDragDrop(e, null)}></div>
    </div>`
}

function renderTab (model) {
  let cls = model.isActive ? 'active' : ''
  return yo`
    <div
      draggable="true"
      class="tab ${cls}"
      oncontextmenu=${(e) => onContextmenuTab(e, model)}
      onmouseup=${(e) => onClickTab(e, model)}
      ondragstart=${(e) => onTabDragStart(e, model)}
      ondragend=${(e) => onTabDragEnd(e)}
      ondragover=${(e) => onTabDragOver(e)}
      ondrop=${(e) => onTabDragDrop(e, model)}
    >
      ${model.name}${model.isDirty ? '*' : ''}
      <i class="fa fa-times" onclick=${(e) => onCloseTab(e, model)}></i>
    </div>
  `
}

// event handlers
// =

function onClickTab (e, model) {
  e.preventDefault()
  e.stopPropagation()

  if (e.which == 2) emit('editor-unload-model', {model})
  else if (e.which == 1) emit('editor-set-active', {model})
}

function onCloseTab (e, model) {
  e.preventDefault()
  e.stopPropagation()

  emit('editor-unload-model', {model})
}

let dragSrcModel = null

function onTabDragStart (e, model) {
  if (model.isActive) emit('editor-set-active', {model})
  dragSrcModel = model

  e.dataTransfer.effectAllowed = 'move'
}

function onTabDragEnd (e) {
  document.dispatchEvent(new Event('editor-rerender'))
}

function onTabDragOver (e) {
  e.preventDefault()

  e.dataTransfer.dropEffect = 'move'
  return false
}

function onTabDragDrop (e, model) {
  e.stopPropagation()

  if (dragSrcModel != model) {
    emit('editor-reorder-models', {srcModel: dragSrcModel, dstModel: model})
  }
  return false
}

async function onContextmenuTab (e, model) {
  e.preventDefault()
  e.stopPropagation()

  var items = [
    {
      icon: false,
      label: 'Close',
      click: async () => {
        emit('editor-unload-model', {model})
      }
    },
    {
      icon: false,
      label: 'Close Others',
      click: () => {
        emit('editor-unload-all-models-except', {model})
      }
    },
    {
      icon: false,
      label: 'Close All',
      click: () => {
        emit('editor-unload-all-models')
      }
    }
  ]

  contextMenu.create({
    x: e.clientX,
    y: e.clientY,
    items
  })
}
