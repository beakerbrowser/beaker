import yo from 'yo-yo'
import {renderOptionsDropdown} from './options-dropdown'
import * as contextMenu from '../context-menu'
import toggleable2 from '../toggleable2'
import * as toast from '../toast'
import {writeToClipboard, emit} from '../../../lib/fg/event-handlers'

// rendering
// =

export function render ({archive, models, openLinkVersion, archiveInfo, isReadonly}) {
  var isOwner = archive.info.isOwner
  var versionLabel = (Number.isNaN(+openLinkVersion)) ? openLinkVersion : `v${openLinkVersion}`
  if (versionLabel === 'latest') versionLabel = ''
  var url = openLinkVersion === 'latest' ? archive.checkout().url : archive.checkout(openLinkVersion).url
  var activeModel = models.find(m => m.isActive)
  return yo`
    <div class="editor-tabs">
      <div class="tab ${activeModel ? '' : 'active'}" onclick=${e => emit('editor-show-general-help')}>Welcome</div>
      ${models.map(model => renderTab(model))}
      <div class="unused-space" ondragover=${(e) => onTabDragOver(e)} ondrop=${(e) => onTabDragDrop(e, null)}></div>
      <div class="ctrls">
        ${isOwner
          ? renderOptionsDropdown({archiveInfo})
          : yo`<span>
            Read-only
            <a class="btn" style="margin-left: 5px" onclick=${e => emit('editor-fork')}>
              <span class="far fa-clone"></span> Make an editable copy
            </a>
          </span>`}
        <a class="btn primary" href=${url} target="_blank">
          <i class="fas fa-external-link-alt"></i> Open ${versionLabel}
        </a>
        <button class="btn transparent nofocus" onclick=${() => onCopy(url, 'URL copied to clipboard')}>
          <span class="fas fa-link"></span> Copy link
        </button>
      </div>
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

function onCopy (str, successMessage = 'Copied to clipboard') {
  writeToClipboard(str)
  toast.create(successMessage)
}