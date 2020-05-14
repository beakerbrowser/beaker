import yo from 'yo-yo'
import {pluralize} from '../../../../lib/strings'
import {emit} from '../../../lib/event-handlers'
import createMd from '../../../../lib/markdown'

// exported api
// =

export function renderHome (opts) {
  const {
    archiveInfo,
    currentDiff,
    readmeMd,
    workingCheckoutVersion,
    workingDatJson,
    isReadonly,
    OS_USES_META_KEY
  } = opts
  const {
    isOwner,
    localSyncPathIsMissing,
    missingLocalSyncPath
   } = archiveInfo
  const isSaved = archiveInfo.userSettings.isSaved
  const isTrashed = isOwner && !isSaved
  const versionLabel = (Number.isNaN(+workingCheckoutVersion)) ? workingCheckoutVersion : `v${workingCheckoutVersion}`
  const previewMode = archiveInfo.userSettings.previewMode
  return yo`
    <div class="editor-home">
      ${localSyncPathIsMissing && !isTrashed
        ? yo`
          <div class="message error error-notice">
            <span>
              <i class="fas fa-exclamation-triangle"></i>
              The local folder was deleted or moved.
              (${missingLocalSyncPath})
            </span>
            <button class="btn" onclick=${e => emit('editor-change-sync-path')}>Resolve</button>
          </div>`
        : ''}
      ${isTrashed
        ? yo`
          <div class="message error error-notice">
            <span>
              <i class="fas fa-trash"></i>
              "${archiveInfo.title || 'This archive'}"
              is in the Trash.
            </span>
            <button class="btn" onclick=${e => emit('editor-archive-save')}><i class="fas fa-undo"></i> Restore from Trash</button>
            <button class="btn" onclick=${e => emit('editor-archive-delete-permanently')} style="margin-left: 5px">Delete permanently</button>
          </div>`
        : !previewMode && workingCheckoutVersion !== 'latest'
          ? yo`
            <h3 class="viewing">
              Viewing <strong>${versionLabel}</strong>.
              <a class="link" href="beaker://editor/${archiveInfo.url}+latest">Go to latest</a>.
            </h3>`
          : previewMode && workingCheckoutVersion !== 'preview'
            ? yo`
              <h3 class="viewing">
                Viewing <strong>${versionLabel}</strong>.
                <a class="link" href="beaker://editor/${archiveInfo.url}+preview">Go to preview</a>.
              </h3>`
            : ''}
      ${renderDiff(currentDiff)}
      ${readmeMd
        ? renderReadme(archiveInfo, readmeMd)
        : yo`
          <div style="text-align: center; padding-top: 15vh">
            <span class="fas fa-code" style="font-size: 50vh; color: #eee; margin-left: -5vw"></span>
          </div>
        `
      }
      ${''/*renderHotkeyHelp({OS_USES_META_KEY})*/}
    </div>`
}

function renderDiff (currentDiff) {
  if (!currentDiff || !currentDiff.length) {
    return ''
  }

  const total = currentDiff.length
  const onShowDiff = filediff => e => {
    if (filediff.change === 'del') {
      emit('editor-set-active-deleted-filediff', {filediff})
    } else {
      emit('editor-set-active', {path: filediff.path, showDiff: true})
    }
  }
  return yo`
    <div class="uncommitted-changes">
      <h3>${total} uncommitted ${pluralize(total, 'change')}</h3>
      <div class="btns">
        <button class="btn primary" onclick=${onCommitAll}><span class="fas fa-check fa-fw"></span> Commit all changes</button>
        <button class="btn transparent" onclick=${onRevertAll}><span class="fas fa-undo fa-fw"></span> Revert all</button>
      </div>
      ${currentDiff.map(filediff => yo`
        <div>
          <span class="revision-indicator ${filediff.change}"></span>
          <a class=${filediff.change} onclick=${onShowDiff(filediff)}>${filediff.path}</a>
        </div>
      `)}
    </div>`
}

function renderReadme (archiveInfo, readmeMd) {
  if (!readmeMd) {
    return yo`
      <div class="readme markdown">
        <h1>${archiveInfo.title || 'Untitled'}</h1>
        <p>${archiveInfo.description || ''}</p>
      </div>
    `
  }

  var markdownRenderer = createMd({
    useHeadingAnchors: true,
    hrefMassager (href, context) {
      if (href.startsWith('#')) {
        return href
      }

      var isRelative = href.startsWith('/') || href.startsWith('./')
      if (!isRelative && href.indexOf(':') === -1) {
        isRelative = true
      }
      if (isRelative) {
        if (href.startsWith('./')) href = href.slice(2)
        if (href.startsWith('/')) href = href.slice(1)
        return `${archiveInfo.url}/${href}`
      }
      if (context === 'img') {
        if (!href.startsWith(archiveInfo.url)) {
          // disable remote embeds
          return null
        }
      }
      return href
    },
    highlight (str, lang) {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return hljs.highlight(lang, str).value
        } catch (__) {}
      }

      return '' // use external default escaping
    }
  })

  var readmeContent = yo`<div class="readme markdown"></div>`
  readmeContent.innerHTML = markdownRenderer.render(readmeMd)
  return readmeContent
}

function renderHotkeyHelp ({OS_USES_META_KEY}) {
  return
  // TODO restoreme when hotkeys are actually implemented again
  const cmd = '⌘'
  const cmdOrCtrl = OS_USES_META_KEY ? cmd : 'Ctrl'
  const hotkey = (action, ...keys) => yo`<div><strong>${keys.join(' + ')}</strong> - ${action}</div>`
  return yo`
    <div class="hotkeys">
      <h3>Hotkeys</h3>
      ${hotkey('New file', cmdOrCtrl, 'N')}
      ${hotkey('Save the current file', cmdOrCtrl, 'S')}
    </div>`
}

// event handlers
// =

function onCommitAll (e) {
  if (!confirm('Commit all changes?')) return
  emit('editor-commit-all')
}

function onRevertAll (e) {
  if (!confirm('Revert all changes?')) return
  emit('editor-revert-all')
}
