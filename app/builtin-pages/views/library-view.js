/* globals DatArchive beaker hljs confirm */

import yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'
import moment from 'moment'
import {FSArchive} from 'beaker-virtual-fs'
import {Archive as LibraryDatArchive} from 'builtin-pages-lib'
import parseDatURL from 'parse-dat-url'
import {diffLines} from '@beaker/dat-archive-file-diff'
import _get from 'lodash.get'
import throttle from 'lodash.throttle'
import dragDrop from 'drag-drop'
import {join as joinPaths} from 'path'
import FilesBrowser from '../com/files-browser2'
import toggleable from '../com/toggleable'
import toggleable2, {closeAllToggleables} from '../com/toggleable2'
import renderPeerHistoryGraph from '../com/peer-history-graph'
import * as contextMenu from '../com/context-menu'
import * as toast from '../com/toast'
import * as noticeBanner from '../com/notice-banner'
import * as localSyncPathPopup from '../com/library-localsyncpath-popup'
import * as copyDatPopup from '../com/library-copydat-popup'
import * as createFilePopup from '../com/library-createfile-popup'
import renderFaviconPicker from '../com/favicon-picker'
import {RehostSlider} from '../../lib/fg/rehost-slider'
import LibraryViewCompare from '../com/library-view-compare'
import LibraryViewLocalCompare from '../com/library-view-local-compare'
import renderSettingsField from '../com/settings-field'
import {setup as setupAce, config as configureAce, getValue as getAceValue, setValue as setAceValue} from '../com/file-editor'
import {pluralize, shortenHash} from '@beaker/core/lib/strings'
import {writeToClipboard, findParent} from '../../lib/fg/event-handlers'
import createMd from '../../lib/fg/markdown'

const MIN_SHOW_NAV_ARCHIVE_TITLE = [52/*no description*/, 90/*with description*/] // px
const LOCAL_DIFF_POLL_INTERVAL = 10e3 // ms
const NETWORK_STATS_POLL_INTERVAL = 2e3 // ms

// globals
// =

var activeView // will default to 'files'
var archive
var workingCheckout
var archiveFsRoot
var filesBrowser
var rehostSlider

// used in the compare views
var libraryViewCompare
var libraryViewLocalCompare
var localDiffSummary
var isPublishingLocalDiff = false

var markdownRenderer = createMd({hrefMassager: markdownHrefMassager})
var readmeElement

// current values being edited in settings
// false means not editing
var headerEditValues = {
  title: false
}

var toplevelError
var copySuccess = false
var isFaviconSet = true
var wasJustSaved = false // used to make the save button act more nicely
var oldLocalSyncPath = ''
var faviconCacheBuster
var suppressFileChangeEvents = false

// HACK
// Linux is not capable of importing folders and files in the same dialog
// unless we create our own import dialog (FFS!) we just need to change
// behavior based on which platform we're on. This flag tracks that.
// -prf
window.OS_CAN_IMPORT_FOLDERS_AND_FILES = true

// capture the throttled version (onFilesChanged's declaration is hoisted from later in the file)
const onFilesChangedThrottled = throttle(onFilesChanged, 1e3)

// main
// =

async function setupWorkingCheckout () {
  if (archive.url.indexOf('+') !== -1) {
    if (archive.url.endsWith('+latest')) {
      // HACK
      // use +latest to show latest
      // -prf
      workingCheckout = new LibraryDatArchive(archive.checkout().url)
    } else {
      // use given version
      workingCheckout = archive
    }
  } else if (_get(archive, 'info.userSettings.previewMode') && _get(archive, 'info.userSettings.isSaved')) {
    // HACK
    // default to showing the preview when previewMode is on, even if +preview isnt set
    // -prf
    workingCheckout = new LibraryDatArchive(archive.checkout('preview').url)
  } else {
    // use latest checkout
    workingCheckout = new LibraryDatArchive(archive.checkout().url)
  }
  await workingCheckout.setup()
}

setup()
async function setup () {
  // setup dragdrop
  dragDrop(document.body, onDropFiles)

  try {
    // load platform info
    let browserInfo = await beaker.browser.getInfo()
    window.OS_CAN_IMPORT_FOLDERS_AND_FILES = browserInfo.platform === 'darwin'

    // load data
    let url = await parseLibraryUrl()
    archive = new LibraryDatArchive(url)
    await archive.setup()
    await setupWorkingCheckout()

    // go to raw key if we have a shortname
    // (archive.info.url is always the raw url, while archive.url will reflect the given url)
    if (archive.url.startsWith(archive.info.url) === false) {
      window.location = 'beaker://library/' + archive.info.url
      return
    }

    document.title = `Library - ${_get(archive, 'info.title', 'Untitled')}`

    // construct ui elements
    archiveFsRoot = new FSArchive(null, workingCheckout, archive.info)
    filesBrowser = new FilesBrowser(archiveFsRoot)
    filesBrowser.onSetCurrentSource = onSetCurrentSource
    rehostSlider = new RehostSlider(archive.info)
    rehostSlider.setup()

    // set up download progress
    if (!_get(archive, 'info.isOwner')) {
      await archive.startMonitoringDownloadProgress()
    }

    // check if the favicon is set
    if (_get(archive, 'info.isOwner')) {
      let favicon = await beaker.sitedata.get(archive.url, 'favicon')
      if (!favicon) favicon = await (archive.stat('/favicon.ico').catch(() => null))
      if (!favicon) favicon = await (archive.stat('/favicon.png').catch(() => null))
      if (!favicon) {
        isFaviconSet = false
      }
    }

    // load state and render
    await readViewStateFromUrl()
    await loadDiffSummary()

    // wire up events
    window.addEventListener('popstate', onPopState)
    document.body.addEventListener('click', onClickAnywhere)
    archive.progress.addEventListener('changed', throttle(onProgressUpdate, 2e3))
    document.body.addEventListener('custom-create-file', onCreateFile)
    document.body.addEventListener('custom-add-file', onAddFile)
    document.body.addEventListener('custom-rename-file', onRenameFile)
    document.body.addEventListener('custom-delete-file', onDeleteFile)
    document.body.addEventListener('custom-open-file-editor', onOpenFileEditor)
    document.body.addEventListener('custom-close-file-editor', onCloseFileEditor)
    document.body.addEventListener('custom-save-file-editor-content', onSaveFileEditorContent)
    document.body.addEventListener('custom-config-file-editor', onConfigFileEditor)
    document.body.addEventListener('custom-set-view', onChangeView)
    document.body.addEventListener('custom-render', render)
    document.body.addEventListener('custom-start-publish', onStartPublish)
    document.body.addEventListener('custom-finish-publish', onFinishPublish)
    document.body.addEventListener('custom-local-diff-changed', loadDiffSummary)
    document.body.addEventListener('custom-open-preview-dat', onOpenPreviewDat)
    beaker.archives.addEventListener('updated', onArchiveUpdated)
    beaker.archives.addEventListener('network-changed', onNetworkChanged)
    beaker.archives.addEventListener('folder-sync-error', onFolderSyncError)

    setInterval(updateNetworkStats, NETWORK_STATS_POLL_INTERVAL)
    setInterval(loadDiffSummary, LOCAL_DIFF_POLL_INTERVAL)
    window.addEventListener('focus', loadDiffSummary)

    var fileActStream = archive.watch()
    fileActStream.addEventListener('invalidated', onFilesChangedThrottled)
    fileActStream.addEventListener('changed', onFilesChangedThrottled)
    if (_get(archive, 'info.userSettings.previewMode')) {
      fileActStream = workingCheckout.watch()
      fileActStream.addEventListener('invalidated', onFilesChangedThrottled)
      fileActStream.addEventListener('changed', onFilesChangedThrottled)
    }
  } catch (e) {
    console.error('Load error', e)
    toplevelError = createToplevelError(e)
    render()
  }

  if (archive) {
    // update last library access time
    beaker.archives.touch(
      archive.url.slice('dat://'.length),
      'lastLibraryAccessTime'
    ).catch(console.error)
  }
}

async function updateNetworkStats () {
  if (activeView !== 'network') return
  var info = await archive.getInfo()
  Object.assign(archive.info, info)
  yo.update(document.querySelector('.big-stats'), renderNetworkBigStats())
  yo.update(document.querySelector('.small-stats'), renderNetworkSmallStats())
}

async function loadDiffSummary () {
  if (isPublishingLocalDiff) {
    return // wait till publish finishes
  }
  if (_get(archive, 'info.userSettings.previewMode', false)) {
    try {
      let localDiff = await beaker.archives.diffLocalSyncPathListing(archive.url)
      if (libraryViewLocalCompare) {
        libraryViewLocalCompare.setCompareDiff(localDiff)
      }

      localDiffSummary = {add: 0, mod: 0, del: 0, hasChange: localDiff.length > 0}
      for (let d of localDiff) {
        localDiffSummary[d.change]++
      }
    } catch (e) {
      console.warn('Failed to load local diff', e)
    }
    rerenderLocalDiffSummary()
  }
}

async function loadReadme () {
  readmeElement = null
  var readmeContent = null
  var readmeHeader = null

  const {isOwner} = archive.info
  const node = filesBrowser.getCurrentSource()
  if (node && node.hasChildren) {
    // try to find the readme.md file
    const readmeMdNode = node.children.find(n => (n._name || '').toLowerCase() === 'readme.md')
    if (readmeMdNode) {
      // render the element
      const readmeMd = await workingCheckout.readFile(readmeMdNode._path, 'utf8')
      readmeContent = yo`<div class="readme markdown"></div>`
      readmeContent.innerHTML = markdownRenderer.render(readmeMd)
      readmeHeader = yo`
        <div class="file-view-header">
          <span class="path">${readmeMdNode.name}</span>
          ${isOwner ? yo`<span class="actions"><a class="btn plain" onclick=${e => gotoFileEditor(readmeMdNode.name)}><span class="fa fa-pencil"></a></span>` : ''}
        </div>`
    } else {
      // try to find the readme file
      const readmeNode = node.children.find(n => (n._name || '').toLowerCase() === 'readme')
      if (readmeNode) {
        // render the element
        const readme = await workingCheckout.readFile(readmeNode._path, 'utf8')
        readmeContent = yo`<div class="readme plaintext">${readme}</div>`
        readmeHeader = yo`
          <div class="file-view-header">
            <span class="path">${readmeNode.name}</span>
            ${isOwner ? yo`<span class="actions"><a class="btn plain" onclick=${e => gotoFileEditor(readmeNode.name)}><span class="fa fa-pencil"></a></span>` : ''}
          </div>`
      }
    }

    // apply syntax highlighting
    if (readmeContent && window.hljs) {
      Array.from(readmeContent.querySelectorAll('code'), codeEl => {
        let cls = codeEl.className
        if (!cls.startsWith('language-')) return
        let lang = cls.slice('language-'.length)

        let res = hljs.highlight(lang, codeEl.textContent)
        if (res) codeEl.innerHTML = res.value
      })
    }

    // set up readme fileheader
    if (readmeContent) {
      const id = `readme-${Date.now()}` // use an id to help yoyo figure out element ==
      readmeElement = yo`
        <div id=${id} class="file-view-container readme">
          ${readmeHeader}
          ${readmeContent}
        </div>`
    }
  }

  render()
}

async function gotoFileEditor (filePath) {
  // go to the new path
  window.history.pushState('', {}, `beaker://library/${archive.url}/${filePath}`)
  await readViewStateFromUrl()
  onOpenFileEditor()
}

// rendering
// =

function render () {
  if (!archive) {
    yo.update(
      document.querySelector('.library-wrapper'), yo`
        <div class="library-wrapper library-view builtin-wrapper">
          <div class="builtin-main" style="margin-left: 0; width: 100%" onscroll=${onScrollMain}>
            <div class="view-wrapper">
              ${renderView()}
            </div>
          </div>
        </div>`
      )
  } else {
    var isReadOnly = !_get(archive, 'info.isOwner')
    yo.update(
      document.querySelector('.library-wrapper'), yo`
        <div class="library-wrapper library-view builtin-wrapper ${isReadOnly ? 'readonly' : ''}">
          <div class="drag-hint">
            <div class="icons">
              <i class="fa fa-file-video-o"></i>
              <i class="fa fa-file-image-o"></i>
              <i class="fa fa-file-code-o"></i>
              <i class="fa fa-file-text-o"></i>
              <i class="fa fa-file-archive-o"></i>
            </div>

            <h1>Drop to add files</h1>

            <p>
              Dropped files will be published directly to
              <a href=${archive.url}>${shortenHash(archive.url)}</a>
            </p>
          </div>

          <div class="builtin-main" style="margin-left: 0; width: 100%" onscroll=${onScrollMain}>
            ${renderHeader()}

            <div class="view-wrapper">
              ${_get(archive, 'info.localSyncPathIsMissing') && activeView === 'files'
                ? yo`
                  <div class="container">
                    <div class="message info">
                      <span>
                        This project${"'"}s local folder
                        ${_get(archive, 'info.missingLocalSyncPath') ? `(${_get(archive, 'info.missingLocalSyncPath')})` : ''}
                        was moved or deleted.
                      </span>

                      <button class="btn" onclick=${onChangeSyncDirectory}>Choose new folder</button>
                    </div>
                  </div>`
                : ''
              }

              ${_get(archive, 'info.isOwner') && !_get(archive, 'info.userSettings.isSaved')
                ? yo`
                  <div class="container">
                    <div class="message error">
                      <span>
                        "${_get(archive, 'info.title', 'This archive')}"
                        is in the Trash.
                      </span>
                      <button class="btn" onclick=${onSave}>Restore from Trash</button>
                      <button class="btn" onclick=${onDeletePermanently} style="margin-left: 5px">Delete permanently</button>
                    </div>
                  </div>`
                : ''
              }

              ${renderView()}
            </div>
          </div>
        </div>
      `
    )
  }
}

function renderHeader () {
  const isOwner = _get(archive, 'info.isOwner')
  const isSaved = _get(archive, 'info.userSettings.isSaved')
  const hasDescription = !!_get(archive, 'info.description')
  const isExpanded = !isNavCollapsed({ignoreScrollPosition: true})
  const isEditingTitle = headerEditValues.title !== false

  return yo`
    <div class="library-view-header ${isExpanded ? 'expanded' : ''} ${hasDescription ? 'has-description' : ''}">
      ${isExpanded
        ? yo`
          <div class="container">
            <div class="info">
              <div class="title ${isOwner ? 'editable' : ''} ${isEditingTitle ? 'editing' : ''}">
                ${!isOwner
                    ? yo`<img class="favicon" src="beaker-favicon:32,${archive.url}?cache=${faviconCacheBuster}" />`
                    : toggleable2({
                      id: 'favicon-picker2',
                      closed: ({onToggle}) => yo`
                        <div class="dropdown toggleable-container">
                          <img class="favicon" src="beaker-favicon:32,${archive.url}?cache=${faviconCacheBuster}" onclick=${onToggle} />
                        </div>`,
                      open: ({onToggle}) => yo`
                        <div class="dropdown toggleable-container">
                          <img class="favicon" src="beaker-favicon:32,${archive.url}?cache=${faviconCacheBuster}" onclick=${onToggle} />

                          <div class="dropdown-items subtle-shadow left" onclick=${onToggle}>
                            ${renderFaviconPicker({onSelect: onSelectFavicon})}
                          </div>
                        </div>`
                    })}
                ${isEditingTitle
                  ? yo`
                    <input
                      class="header-title-input"
                      value=${headerEditValues.title || ''}
                      onblur=${e => onBlurHeaderEditor(e, 'title')}
                      onkeyup=${e => onChangeHeaderEditor(e, 'title')} />`
                  : yo`<h1 onclick=${onClickHeaderTitle}>${getSafeTitle()}</h1>`}
                ${!isOwner ? yo`<span class="badge">READ-ONLY</span>` : ''}
              </div>

              ${hasDescription
                ? yo`<p class="description">${archive.info.description}</p>`
                : ''
              }

              <div class="primary-action">
                ${renderSeedMenu()}
                ${renderShareMenu()}
                ${renderMenu()}
              </div>
            </div>
          </div>`
        : ''
      }
      ${renderToolbar()}
    </div>`
}

function renderSeedMenu () {
  const isOwner = _get(archive, 'info.isOwner')
  const isSaved = _get(archive, 'info.userSettings.isSaved')
  if (isOwner) return undefined

  const button = onToggle => yo`
    <button class="btn" onclick=${onToggle}>
      <span class="fa fa-arrow-circle-up"></span>
      Seed${isSaved ? 'ing' : ''}
    </button>`
  return toggleable2({
    id: 'nav-item-seed-menu',
    closed ({onToggle}) {
      return yo`
        <div class="dropdown menu seed toggleable-container">
          ${button(onToggle)}
        </div>`
    },
    open ({onToggle}) {
      return yo`
        <div class="dropdown menu seed toggleable-container">
          ${button(onToggle)}
          <div class="dropdown-items right">
            <div class="section">
              ${rehostSlider.render()}
            </div>
          </div>
        </div>
      `
    },
    async afterOpen () {
      if (!isSaved) {
        // start seeding after open
        await onToggleSeeding()
      }
      rehostSlider.refreshState()
    }
  })
}

function renderShareMenu () {
  var url = archive.checkout().url
  return toggleable2({
    id: 'nav-item-share-tool',
    closed: ({onToggle}) => yo`
      <div class="dropdown share toggleable-container">
        <button class="btn nofocus toggleable" onclick=${onToggle}>
          <span class="fa fa-share-square-o"></span> Share
        </button>
      </div>`,
    open: ({onToggle}) => yo`
      <div class="dropdown share toggleable-container">
        <button class="btn nofocus toggleable" onclick=${onToggle}>
          <span class="fa fa-share-square-o"></span> Share
        </button>

        <div class="dropdown-items subtle-shadow">
          <div class="dropdown-item no-border">
            <div class="label">
              Share
            </div>

            <p class="small">
              Anyone with this link can view this project${"'"}s files
            </p>

            <p class="copy-url">
              <input type="text" disabled value="${url}"/>

              <button class="btn" onclick=${() => onCopy(url, 'URL copied to clipboard')}>
                Copy
              </button>

              <a href=${url} target="_blank" class="btn primary full-width center">
                Open
                <span class="fa fa-external-link"></span>
              </a>
            </p>
          </div>
        </div>
      </div>`
  })
}

function renderMenu () {
  const isOwner = _get(archive, 'info.isOwner')
  const isSaved = _get(archive, 'info.userSettings.isSaved')
  const syncPath = _get(archive, 'info.userSettings.localSyncPath')
  const title = getSafeTitle()
  const description = _get(archive, 'info.description', '').trim()
  const networked = _get(archive, 'info.userSettings.networked', true)

  return toggleable2({
    id: 'nav-item-main-menu',
    closed ({onToggle}) {
      return yo`
        <div class="dropdown menu toggleable-container">
          <button class="btn transparent toggleable" onclick=${onToggle}>
            <i class="fa fa-ellipsis-v"></i>
          </button>
        </div>`
    },
    open ({onToggle}) {
      return yo`
        <div class="dropdown menu toggleable-container">
          <button class="btn transparent toggleable" onclick=${onToggle}>
            <i class="fa fa-ellipsis-v"></i>
          </button>
          <div class="dropdown-items right">
            <div class="section menu-items" onclick=${onToggle}>
              ${''/*<div class="dropdown-item" onclick=${e => {onChangeView(e, 'compare'); onToggle(e)}}>
                <i class="fa fa-files-o"></i>
                Compare files
              </div>*/}

              <div class="dropdown-item" onclick=${onMakeCopy}>
                <i class="fa fa-clone"></i>
                Make ${isOwner ? 'a' : 'an editable'} copy
              </div>

              ${isOwner
                ? isSaved
                  ? yo`
                    <div class="dropdown-item" onclick=${onMoveToTrash}>
                      <i class="fa fa-trash-o"></i>
                      Move to Trash
                    </div>`
                  : [
                    yo`
                      <div class="dropdown-item" onclick=${onSave}>
                        <i class="fa fa-undo"></i> Restore from Trash
                      </div>`,
                    yo`
                      <div class="dropdown-item" onclick=${onDeletePermanently}>
                        <i class="fa fa-times-circle"></i> Delete permanently
                      </div>`
                  ]
                : ''}
            </div>
          </div>
        </div>
      `
    }
  })
}

function renderView () {
  if (toplevelError) {
    return renderErrorView()
  }

  switch (activeView) {
    case 'files':
      return renderFilesView()
    case 'compare':
      return renderCompareView()
    case 'local-compare':
      return renderLocalCompareView()
    case 'settings':
      return renderSettingsView()
    case 'network':
      return renderNetworkView()
    default:
      return yo`<div class="container"><div class="view">Loading...</div></div>`
  }
}

function renderErrorView () {
  return yo`
    <div class="container">
      <div class="view error">
        <div class="message error">
          <i class="fa fa-exclamation-triangle"></i> ${toplevelError || 'Unknown error'}
        </div>
      </div>
    </div>
  `
}

function renderFilesView () {
  return yo`
    <div class="container">
      <div class="view files">
        ${renderLocalDiffSummary()}
        ${filesBrowser ? filesBrowser.render() : ''}
        ${readmeElement ? readmeElement : renderReadmeHint()}
        ${!_get(archive, 'info.isOwner') ? renderMakeCopyHint() : ''}
      </div>
    </div>
  `
}

function rerenderLocalDiffSummary () {
  var el = document.getElementById('local-path-and-preview-tools')
  if (!el) return
  yo.update(el, renderLocalDiffSummary())
}

function renderLocalDiffSummary () {
  const isSaved = _get(archive, 'info.userSettings.isSaved')
  if (!_get(archive, 'info.isOwner') || !isSaved) {
    return yo`<div id="local-path-and-preview-tools empty"></div>`
  }

  const syncPath = _get(archive, 'info.userSettings.localSyncPath')
  const previewMode = _get(archive, 'info.userSettings.previewMode')
  const total = localDiffSummary ? (localDiffSummary.add + localDiffSummary.mod + localDiffSummary.del) : 0

  function rRevisionIndicator (type) {
    if (!localDiffSummary || localDiffSummary[type] === 0) return ''
    return yo`<div class="revision-indicator ${type}"></div>`
  }

  if (!syncPath && !previewMode) {
    // DEBUG
    return yo`<div id="local-path-and-preview-tools empty"></div>`

    if (isLocalPathPromptDismissed()) {
      return yo`<div id="local-path-and-preview-tools empty"></div>`
    }
    return yo`
      <div id="local-path-and-preview-tools" class="setup-tip">
        <div>
          <i class="fa fa-lightbulb-o"></i>
          <strong>Tip:</strong>
          Set a local folder to access this site${"'"}s files from outside of the browser.
        </div>
        <button class="btn primary" onclick=${onChangeSyncDirectory}>Set a local folder</button>
        <button class="btn transparent" onclick=${onDismissLocalPathPrompt}>Dismiss</button>
      </div>`
  }

  var pathCtrls
  if (syncPath) {
    pathCtrls = yo`
      <div class="path">
        <button class="link sync-path-link" onclick=${onSyncPathContextMenu}>${syncPath} <i class="fa fa-angle-down"></i></button>
      </div>`
  } else {
    pathCtrls = yo`<div class="path">Preview mode</div>`    
  }

  var previewCtrls
  if (previewMode) {
    previewCtrls = [
      rRevisionIndicator('add'),
      rRevisionIndicator('mod'),
      rRevisionIndicator('del'),
      yo`<span class="summary">${total} ${pluralize(total, 'change')}</span>`,
      yo`<a
        class="btn tooltip-container"
        href=${`beaker://library/${archive.url}#local-compare`}
        data-tooltip="Review changes and publish"
        onclick=${e => onChangeView(e, 'local-compare')}
      >
        Review changes
      </a>`,
      yo`<a
        class="btn primary tooltip-container"
        href=${archive.url + '+preview'}
        data-tooltip="Preview the unpublished version of the site"
        onclick=${onOpenPreviewDat}
      >
        <i class="fa fa-external-link"></i> Open preview
      </a>`
    ]
  } else {
    previewCtrls = yo`
      <span class="summary">Synchronizing</span>`
  }

  return yo`
    <div id="local-path-and-preview-tools">
      ${pathCtrls}
      ${previewCtrls}
    </div>`
}

function renderMakeCopyHint () {
  return yo`
    <div class="hint">
      <p>
        <i class="fa fa-lightbulb-o"></i>
        Want to edit these files? <button class="link" onclick=${onMakeCopy}>Make a copy!</button>
      </p>
    </div>`
}

function renderReadmeHint () {
  if (!_get(archive, 'info.isOwner')) return ''
  var currentNode = filesBrowser.getCurrentSource()
  if (currentNode && currentNode.parent) return '' // only at root

  return yo`
    <div class="hint">
      <p>
        <i class="fa fa-book"></i>
        Add a README to help others learn about this project.
      </p>

      <div>
        <button class="btn" onclick=${addReadme}>
          Add
        </button>

        <a class="learn-more-link" href="https://en.wikipedia.org/wiki/README" target="_blank">What${"'"}s a README?</a>
      </div>
    </div>`
}

function renderSettingsView () {
  const isOwner = _get(archive, 'info.isOwner')

  const title = _get(archive, 'info.title', '')
  const description = _get(archive, 'info.description', '')
  const paymentLink = _get(archive, 'info.links.payment') ? archive.info.links.payment[0].href : ''
  const baseUrl = `beaker://library/${archive.url}`

  var syncPath = _get(archive, 'info.userSettings.localSyncPath')
  var previewMode = _get(archive, 'info.userSettings.previewMode')
  var localDirectorySettings = ''
  if (syncPath || oldLocalSyncPath) {
    let p = syncPath || oldLocalSyncPath
    localDirectorySettings = yo`
      <div>
        <form>
          <div class="input-group radiolist">
            <input type="radio" ${!syncPath ? 'checked' : ''} id="noSync" name="has-sync-path" onchange=${e => onChangeHasSyncDirectory('')} />
            <label for="noSync">Don${"'"}t sync to the local filesystem</label>
          </div>

          <div class="input-group radiolist sync-path">
            <input type="radio" ${syncPath ? 'checked' : ''} name="has-sync-path" id="syncPath" onchange=${e => onChangeHasSyncDirectory(oldLocalSyncPath)} />
            <label for="syncPath">Sync this project${"'"}s files to</label>

            <input readonly disabled=${!syncPath} type="text" value=${p} placeholder="Choose directory"/>

            <button type="button" class="btn mobile" onclick=${onChangeSyncDirectory}>
              Choose
            </button>

            <button type="button" class="btn desktop" onclick=${onChangeSyncDirectory}>
              Choose directory
            </button>
          </div>
        </form>
      </div>`
  } else if (_get(archive, 'info.localSyncPathIsMissing')) {
    localDirectorySettings = yo`
      <div>
        <p>
          <em>
            <i class="fa fa-exclamation-circle"></i> This project${"'"}s local folder was deleted or moved. (${archive.info.missingLocalSyncPath})
          </em>

          <form>
            <button type="button" class="btn" onclick=${onChangeSyncDirectory}>
              Choose new folder
            </button>
            <button type="button" class="btn" onclick=${onRemoveSyncDirectory}>
              Stop syncing
            </button>
          </form>
        </p>
      </div>`
  } else {
    localDirectorySettings = yo`
      <div>
        <p>
          Set a local folder to access this site${"'"}s files from outside of the browser.

          <form>
            <button type="button" class="btn" onclick=${onChangeSyncDirectory}>
              Set local folder
            </button>
          </form>
        </p>
      </div>`
  }

  return yo`
    <div class="container">
      ${isOwner
        ? yo`
          <div class="settings view">
            <div class="section">
              <h2 class="section-heading">
                Preview mode
              </h2>

              <div class="section-content">
                <div class="input-group radiolist sub-item">
                  <label class="toggle">
                    <span class="text">Preview changes before publishing to the network</span>
                    <input
                      type="checkbox"
                      name="autoPublish"
                      value="autoPublish"
                      ${previewMode ? 'checked' : ''}
                      onclick=${onTogglePreviewMode}
                    >
                    <div class="switch"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>`
        : ''}

      ${isOwner
        ? yo`
          <div class="settings view">
            <div class="section">
              <h2 class="section-heading">
                Local folder
              </h2>

              <div class="section-content">
                ${localDirectorySettings}
              </div>
            </div>
          </div>`
        : ''
      }

      <div class="settings view">
        <div class="section">
          <h2 class="section-heading">
            General
          </h2>

          <div class="section-content">
            <h3 class="no-margin">Title</h3>
            ${isOwner
              ? renderSettingsField({key: 'title', value: title, onUpdate: setManifestValue})
              : yo`<p>${getSafeTitle()}</p>`
            }

            <h3>Description</h3>
            ${isOwner
              ? renderSettingsField({key: 'description', value: description, onUpdate: setManifestValue})
              : yo`<p>${getSafeDesc()}</p>`
            }

            <h3>Icon</h3>
            ${isOwner
              ? yo`
                <p>
                  ${toggleable2({
                    id: 'favicon-picker',
                    closed: ({onToggle}) => yo`
                      <div class="dropdown toggleable-container">
                        <img class="favicon-picker-btn" src="beaker-favicon:32,${archive.url}?cache=${faviconCacheBuster}" onclick=${onToggle} />
                      </div>`,
                    open: ({onToggle}) => yo`
                      <div class="dropdown toggleable-container">
                        <img class="favicon-picker-btn pressed" src="beaker-favicon:32,${archive.url}?cache=${faviconCacheBuster}" onclick=${onToggle} />

                        <div class="dropdown-items subtle-shadow left" onclick=${onToggle}>
                          ${renderFaviconPicker({onSelect: onSelectFavicon})}
                        </div>
                      </div>`
                  })}
              </p>`
              : yo`<p><img class="favicon" src="beaker-favicon:32,${archive.url}" /></p>`
            }
          </div>
        </div>
      </div>

      <div class="settings view">
        <div class="section">
          <h2 class="section-heading">
            Links
          </h2>

          <div class="section-content">

            <h3 class="no-margin">Donation page</h3>
            ${isOwner
              ? yo`
                  <p>
                    Enter a link to your donation page and Beaker will show
                    a <span class="fa fa-heart"></span> icon in your page's URL bar.

                    ${renderSettingsField({key: 'paymentLink', value: paymentLink, placeholder: 'Example: https://opencollective.com/beaker', onUpdate: setManifestValue})}
                  </p>
                `
              : paymentLink
                ? yo`<p><a href=${paymentLink}>${paymentLink}</a></p>`
                : yo`<p><em>No link provided.</em></p>`
            }
          </div>
        </div>
      </div>
    </div>
  `
}

function renderNetworkBigStats () {
  return yo`
    <div class="big-stats">
      <div><span>up</span> ${prettyBytes(archive.info.networkStats.uploadSpeed)}/s</div>
      <div><span>down</span> ${prettyBytes(archive.info.networkStats.downloadSpeed)}/s</div>
    </div>`
}

function renderNetworkSmallStats () {
  const {downloadTotal, uploadTotal} = archive.info.networkStats
  return yo`
    <div class="small-stats">
      <div>${archive.info.peers} <span>${pluralize(archive.info.peers, 'peer')}</span></div>
      <div>${prettyBytes(downloadTotal)} <span>downloaded</span></div>
      <div>${prettyBytes(uploadTotal)} <span>uploaded</span></div>
      ${downloadTotal > 0 ? yo`<div>${(uploadTotal / downloadTotal).toFixed(2)}x <span>ratio</span></div>`: ''}
    </div>`
}

function renderNetworkView () {
  var progressLabel = ''
  var progressCls = ''

  const baseUrl = `beaker://library/${archive.url}`
  const {isSaved, expiresAt} = archive.info.userSettings
  const {progress} = archive
  const progressPercentage = `${progress.current}%`
  var downloadedBytes = _get(archive, 'info.isOwner')
    ? archive.info.size
    : (archive.info.size / progress.blocks) * progress.downloaded

  if (!archive.info.isOwner) {
    if (isSaved) {
      if (progress.isComplete) {
        progressLabel = 'Seeding files'
        progressCls = 'green'
      } else {
        progressLabel = 'Downloading and seeding files'
        progressCls = 'green active'
      }
    } else if (progress.isComplete) {
      progressLabel = 'All files downloaded'
    } else {
      progressLabel = 'Idle'
    }
  }

  var expiresAtSliderValue
  var expiresAtLabel
  var expiresAtCircleColor
  const timeRemaining = (isSaved && expiresAt) ? moment.duration(expiresAt - Date.now()) : null
  if (timeRemaining) {
    expiresAtCircleColor = 'yellow'
    if (timeRemaining.asMonths() > 0.5) {
      expiresAtSliderValue = 2
      expiresAtLabel = '1 month'
    } else if (timeRemaining.asWeeks() > 0.5) {
      expiresAtSliderValue = 1
      expiresAtLabel = '1 week'
    } else {
      expiresAtSliderValue = 0
      expiresAtLabel = '1 day'
    }
    expiresAtLabel += ` (${timeRemaining.humanize()} remaining)`
  } else {
    expiresAtSliderValue = 3
    expiresAtCircleColor = 'green'
    expiresAtLabel = 'Forever'
  }

  return yo`
    <div class="container">
      <div class="view network">

        <h1>Network activity</h1>

        <div class="section">${renderNetworkBigStats()}</div>
      </div>

      ${_get(archive, 'info.isOwner')
        ? ''
        : yo`
          <div class="view network">
            <div class="section">
              <div class="seed-controls">
                <div class="seed-toggle">
                  <label class="toggle">
                    <span class="text">Seed this site${"'"}s files</span>
                    <input
                      type="checkbox"
                      name="seed"
                      value="seed"
                      ${isSaved ? 'checked' : ''}
                      onclick=${onToggleSeeding}
                    >
                    <div class="switch"></div>
                  </label>
                </div>

                ${isSaved
                  ? [
                    yo`
                      <div class="seed-slider">
                        <input
                          name="seed-period"
                          type="range"
                          min="0"
                          max="3"
                          step="1"
                          list="steplist"
                          value=${expiresAtSliderValue}
                          oninput=${onChangeExpiresAt} />
                        <datalist id="steplist">
                            <option>0</option>
                            <option>1</option>
                            <option>2</option>
                            <option>3</option>
                        </datalist>
                      </div>`,
                    yo`
                      <div class="seed-time-label">
                        <span class="fa fa-circle ${expiresAtCircleColor}"></span>
                        ${expiresAtLabel}
                      </div>`
                  ] : yo`
                    <div class="hint">
                      <i class="fa fa-heart-o"></i>
                      <strong>Give back!</strong> Seed this project${"'"}s files to help keep them online.
                      <a href="https://beakerbrowser.com/docs/how-beaker-works/peer-to-peer-websites#keeping-a-peer-to-peer-website-online" target="_blank" class="learn-more-link">Learn more</a>
                    </div>`
                  }
              </div>
            </div>
          </div>
        </div>`
      }

      ${_get(archive, 'info.isOwner')
        ? ''
        : yo`
          <div class="view network">
            <div class="section">
              <h3 class="subtitle-heading">Download status</h3>

              <progress value=${progress.current} max="100">
                ${progress.current}
              </progress>

              <div class="download-status">
                <div class="progress-ui ${progressCls}">
                  <div style="width: ${progressPercentage}" class="completed">
                    ${progressPercentage}
                  </div>
                  <div class="label">
                    ${progressLabel} | <button class="link" onclick=${onDeleteDownloadedFiles}>Delete downloaded files</button>
                  </div>
                </div>

                ${''/* TODO we need more precise control over downloads before we can support this -prf
                  !archive.info.isOwner && !progress.isComplete
                  ? yo`
                    <button class="btn transparent" data-tooltip="Download all files" onclick=${onDownloadAllFiles}>
                      <i class="fa fa-arrow-down"></i>
                    </button>`
                  : ''
                */}
              </div>
            </div>
          </div>
        </div>`
      }

      <div class="view network">
        <div class="section">
          <h3 class="subtitle-heading">Network activity (last hour)</h3>
          ${renderPeerHistoryGraph(archive.info)}
          ${renderNetworkSmallStats()}
        </div>
      </div>

      <div class="view network">
        <div class="section">
          <h3 class="subtitle-heading">Advanced</h3>
          <a href="beaker://swarm-debugger/${archive.key}" target="_blank">
            Open network debugger
          </a>
        </div>
      </div>

      ${_get(archive, 'info.isOwner')
        ? yo`
          <div class="view network">
            <div class="section">
              <div class="hint">
                <p>
                  <i class="fa fa-signal"></i>
                  <strong>Keep your files online.</strong> Share this project${"'"}s URL with friends, or with a public peer service like <a href="https://hashbase.io" target="_blank">Hashbase</a>.
                </p>

                <button class="btn" onclick=${() => onCopy(archive.url, 'URL copied to clipboard')}>
                  Copy URL
                </button>

                <a href="https://beakerbrowser.com/docs/how-beaker-works/peer-to-peer-websites#keeping-a-peer-to-peer-website-online" target="_blank" class="learn-more-link">Learn more</a>
              </div>
            </div>
          </div>`
        : ''
      }
    </div>
  `
}

function renderCompareView () {
  if (!libraryViewCompare) {
    let isOwner = _get(archive, 'info.isOwner')
    libraryViewCompare = new LibraryViewCompare({
      baseUrl: isOwner ? null : archive.url,
      targetUrl: isOwner ? archive.url : null
    })
  }
  return yo`
    <div class="container">
      <div class="view compare">
        ${libraryViewCompare.render()}
      </div>
    </div>`
}

function renderLocalCompareView () {
  if (!libraryViewLocalCompare) {
    libraryViewLocalCompare = new LibraryViewLocalCompare({
      url: archive.url
    })
  }
  return yo`
    <div class="container">
      <div class="view compare">
        ${libraryViewLocalCompare.render()}
      </div>
    </div>`
}


function renderToolbar () {
  var peerCount = _get(archive, 'info.peers', 0)

  var middot = yo`<span class="middot" />`
  middot.innerHTML = '&middot;'

  return yo`
    <div class="library-toolbar">
      <div class="container">
        <a href="beaker://library" class="back-link">
          <i class="fa fa-angle-double-left"></i>
        </a>

        ${renderNav()}

        <div class="buttons">
          <span class="peer-count">
            ${peerCount}
            ${pluralize(peerCount, 'peer')}
          </span>

          ${middot}

          <a href=${archive.checkout().url} class="link" target="_blank">
            ${shortenHash(archive.checkout().url)}
          </a>
        </div>
      </div>
    </div>
  `
}

function renderNav () {
  const isOwner = _get(archive, 'info.isOwner')
  const baseUrl = `beaker://library/${archive.url}`
  const collapsed = isNavCollapsed()

  return yo`
    <div class="nav-items">
      <a href=${baseUrl} onclick=${e => onChangeView(e, 'files')} class="nav-item nav-archive-title ${collapsed ? 'visible' : ''}">
        <img class="favicon" src="beaker-favicon:32,${archive.url}?cache=${faviconCacheBuster}" />
        ${getSafeTitle()}
      </a>

      <a href=${baseUrl} onclick=${e => onChangeView(e, 'files')} class="nav-item ${activeView === 'files' ? 'active' : ''}">
        Files
      </a>

      <a href=${baseUrl + '#network'} onclick=${e => onChangeView(e, 'network')} class="nav-item ${activeView === 'network' ? 'active' : ''}">
        Network
      </a>

      <a href=${baseUrl + '#settings'} onclick=${e => onChangeView(e, 'settings')} class="nav-item ${activeView === 'settings' ? 'active' : ''}">
        ${isOwner ? 'Settings' : 'About'}
      </a>
    </div>
  `
}

// events
// =

async function onMakeCopy () {
  let {title} = await copyDatPopup.create({archive})
  const fork = await DatArchive.fork(archive.url, {title, prompt: false}).catch(() => {})
  window.location = `beaker://library/${fork.url}#setup`
}

async function addReadme () {
  const readme = `# ${archive.info.title || 'Untitled'}\n\n${archive.info.description || ''}`
  await workingCheckout.writeFile('/README.md', readme)
  await loadReadme()
  render()
}

function onToggleSaved () {
  if (_get(archive, 'info.userSettings.isSaved')) {
    return onMoveToTrash()
  } else {
    return onSave()
  }
}

async function onMoveToTrash () {
  const nickname = getSafeTitle()
  try {
    await beaker.archives.remove(archive.url)
    archive.info.userSettings.isSaved = false
    toast.create(`Removed ${nickname} from your Library`, 'success')
  } catch (e) {
    console.error(e)
    toast.create(`Could not move ${nickname} to Trash`, 'error')
  }
  render()
}

async function onDeletePermanently () {
  const nickname = getSafeTitle()
  if (confirm(`Delete ${nickname} permanently?`)) {
    try {
      await beaker.archives.delete(archive.url)
      window.location = 'beaker://library'
    } catch (e) {
      console.error(e)
      toast.create(`Could not delete ${nickname}`, 'error')
    }
  }
}

async function onSave () {
  const nickname = getSafeTitle()
  try {
    await beaker.archives.add(archive.url)
    archive.info.userSettings.isSaved = true
    toast.create(`Saved ${nickname} to your Library`, 'success')

    // give the save btn time to just say "Saved"
    wasJustSaved = true
    setTimeout(() => { wasJustSaved = false; render() }, 1e3)
  } catch (e) {
    console.error(e)
    toast.create(`Could not save ${nickname} to your Library`, 'error')
  }
  render()
}

async function onToggleNetworked () {
  const nickname = getSafeTitle()
  try {
    if (archive.info.userSettings.networked) {
      await beaker.archives.setUserSettings(archive.url, {networked: false})
      archive.info.userSettings.networked = false
      toast.create(`${nickname} is now offline`, 'success')
    } else {
      await beaker.archives.setUserSettings(archive.url, {networked: true})
      archive.info.userSettings.networked = true
      toast.create(`${nickname} is now online`, 'success')
    }
  } catch (e) {
    console.error(e)
    toast.create(`Could not update ${nickname}`, 'error')
  }
  render()  
}

async function onToggleSeeding () {
  const nickname = getSafeTitle()
  try {
    if (archive.info.userSettings.isSaved) {
      await beaker.archives.remove(archive.url)
      archive.info.userSettings.isSaved = false
    } else {
      await beaker.archives.add(archive.url)
      archive.info.userSettings.isSaved = true
    }
    await beaker.archives.setUserSettings(archive.key, {expiresAt: 0})
  } catch (e) {
    console.error(e)
    toast.create(`Could not update ${nickname}`, 'error')
  }
  render()
}

async function onChangeExpiresAt (e) {
  var sliderState = e.target.value
  var expiresAt = 0
  if (sliderState == 0) expiresAt = +(moment().add(1, 'day'))
  if (sliderState == 1) expiresAt = +(moment().add(1, 'week'))
  if (sliderState == 2) expiresAt = +(moment().add(1, 'month'))
  await beaker.archives.setUserSettings(archive.key, {expiresAt})
  Object.assign(archive.info.userSettings, {expiresAt})
  render()
}

async function onSelectFavicon (imageData) {
  let archive2 = await DatArchive.load('dat://' + archive.info.key) // instantiate a new archive with no version
  if (imageData) {
    await archive2.writeFile('/favicon.ico', imageData)
  } else {
    await archive2.unlink('/favicon.ico').catch(e => null)
    await beaker.sitedata.set(archive.url, 'favicon', '') // clear cache
  }
  faviconCacheBuster = Date.now()
  isFaviconSet = true
  render()
}

function onProgressUpdate () {
  // rerender if we're on the network page (where we show progress stats)
  if (activeView === 'network') {
    render()
  }
}

async function onChangeView (e, view) {
  if (e) {
    e.preventDefault()
    e.stopPropagation()
  }

  // update state
  if (!view) {
    activeView = e.detail.view
    window.history.pushState('', {}, e.detail.href)
  } else {
    activeView = view
    window.history.pushState('', {}, e ? e.currentTarget.getAttribute('href') : view)
  }

  if (activeView === 'files' && archiveFsRoot) {
    // setup files view
    await archiveFsRoot.readData({maxPreviewLength: 1e5})
    await filesBrowser.setCurrentSource(archiveFsRoot, {suppressEvent: true})
    await loadReadme()
    setupAce({readOnly: true})
  }

  render()
  closeAllToggleables()
  document.querySelector('.builtin-main').scrollTo(0, 0)
}

function onStartPublish () {
  // track that we're publishing so that we dont keep loading the diff while it happens
  isPublishingLocalDiff = true
}

function onFinishPublish () {
  // now that publish finished, load the diff summary
  isPublishingLocalDiff = false
  loadDiffSummary()
}

async function onOpenPreviewDat (e) {
  if (e) e.preventDefault()
  window.open(archive.checkout('preview').url)
}

async function onSetCurrentSource (node) {
  // try to load the readme
  loadReadme()

  // initialize ace editor (if needed)
  filesBrowser.isEditMode = false
  setupAce({readOnly: true})

  // update the URL & history
  let path = archive.url
  if (node && node._path) {
    path += node._path
  }
  window.history.pushState('', {}, `beaker://library/${path}`)
}

function onDropFiles (files) {
  if (!archive.info.isOwner) {
    return
  }
  const dst = filesBrowser.getCurrentSource() ? filesBrowser.getCurrentSource().url : null
  if (!dst) return
  files.forEach(f => {
    const src = f.path
    onAddFile({detail: {src, dst}})
  })
}

function onOpenFolder (path) {
  beaker.browser.openFolder(path)
}

function onDownloadAllFiles () {
  // TODO
  // we need more precise control over downloads before we can support this
  // -prf
}

async function onDeleteDownloadedFiles () {
  if (!confirm('Delete downloaded files? You will be able to redownload them from the network.')) {
    return false
  }
  await beaker.archives.clearFileCache(archive.key)
  toast.create('All downloaded files have been deleted.')
  await archive.progress.fetchAllStats()
  render()
}

function onCopy (str, successMessage = 'Copied to clipboard', tooltip = false) {
  if (archive.info) {
    writeToClipboard(str)
    copySuccess = true
    render()

    if (!tooltip) {
      toast.create(successMessage)
    }

    window.setTimeout(() => {
      copySuccess = false
      render()
    }, 1300)
  }
}

async function onChangeHasSyncDirectory (v) {
  if (!archive.info.isOwner) return

  try {
    oldLocalSyncPath = _get(archive, 'info.userSettings.localSyncPath')
    await beaker.archives.setLocalSyncPath(archive.url, v)
    await setup()
  } catch (e) {
    toplevelError = createToplevelError(e)
  }
  render()
}

async function onChangeSyncDirectory () {
  if (!archive.info.isOwner) return

  // get an available path for a folder
  var currentPath = _get(archive, 'info.userSettings.localSyncPath')
  var defaultPath = ''
  if (!currentPath) {
    let basePath = await beaker.browser.getSetting('workspace_default_path')
    defaultPath = await beaker.browser.getDefaultLocalPath(basePath, archive.info.title)
  }

  var hasUnpublishedChanges = false
  var previewMode = _get(archive, 'info.userSettings.previewMode')
  if (previewMode) {
    // prompt to resolve changes
    await loadDiffSummary()
    hasUnpublishedChanges = (localDiffSummary && localDiffSummary.hasChange)
  }

  // open the create folder-picker popup
  let res = await localSyncPathPopup.create({
    defaultPath,
    currentPath,
    checkConflicts: !previewMode,
    hasUnpublishedChanges,
    archiveKey: archive.info.key,
    title: archive.info.title
  })
  let localSyncPath = res.path

  try {
    await beaker.archives.setLocalSyncPath(archive.url, localSyncPath)
  } catch (e) {
    toplevelError = createToplevelError(e)
    render()
    return
  }

  setLocalPathPromptDismissed()
  await setup()
  onOpenFolder(localSyncPath)
  render()
}

async function onTogglePreviewMode (e) {
  e.preventDefault()
  if (!archive.info.isOwner) return

  var previewMode = _get(archive, 'info.userSettings.previewMode')
  if (previewMode) {
    // prompt to resolve changes
    await loadDiffSummary()
    if (localDiffSummary && localDiffSummary.hasChange) {
      alert('You have unpublished changes. Please publish or revert them before disabling preview mode.')
      return
    }
  }

  try {
    previewMode = !previewMode
    await beaker.archives.setUserSettings(archive.url, {previewMode})
    Object.assign(archive.info.userSettings, {previewMode})
  } catch (e) {
    toplevelError = createToplevelError(e)
  }
  render()
}

async function onRemoveSyncDirectory () {
  if (!archive.info.isOwner) return

  try {
    await beaker.archives.setLocalSyncPath(archive.url, null)
    toast.create('Stopped syncing with local folder')
    await setup()
  } catch (e) {
    toplevelError = createToplevelError(e)
    render()
    return
  }
}

async function onCreateFile (e) {
  var {createFolder} = (e.detail || {})
  var currentNode = filesBrowser.getCurrentSource()
  if (!currentNode || !currentNode.isContainer) return // must be a folder
  var basePath = currentNode._path

  // get the name of the new file
  var filePath = await createFilePopup.create({archive, basePath, createFolder})
  if (filePath) {
    if (createFolder) {
      // create new folder
      await workingCheckout.mkdir(filePath)
    } else {
      // create new file (empty)
      await workingCheckout.writeFile(filePath, '', 'utf8')
    }
    // go to the new path
    window.history.pushState('', {}, `beaker://library/${archive.url + filePath}`)
    await readViewStateFromUrl()
    if (!createFolder) {
      // enter edit mode
      onOpenFileEditor()
    }
  }
}

async function onAddFile (e) {
  const {src, dst} = e.detail
  const res = await DatArchive.importFromFilesystem({src, dst, ignore: ['dat.json'], inplaceImport: false})
}

async function onRenameFile (e) {
  try {
    const {path, newName} = e.detail
    const to = setTimeout(() => toast.create('Renaming...'), 500) // if it takes a while, toast
    const newPath = path.split('/').slice(0, -1).concat(newName).join('/')
    await workingCheckout.rename(path, newPath)
    clearTimeout(to)
  } catch (e) {
    toast.create(e.toString(), 'error', 5e3)
  }
}

async function onDeleteFile (e) {
  try {
    const {path, isFolder} = e.detail
    const to = setTimeout(() => toast.create('Deleting...'), 500) // if it takes a while, toast

    if (isFolder) {
      await workingCheckout.rmdir(path, {recursive: true})
    } else {
      await workingCheckout.unlink(path)
    }

    clearTimeout(to)
    toast.create(`Deleted ${path}`)
    render()
  } catch (e) {
    toast.create(e.toString(), 'error', 5e3)
  }
}

function onOpenFileEditor (e) {
  // update the UI
  filesBrowser.isEditMode = true
  render()

  // set the editor to edit mode
  configureAce({readOnly: false})
}

function onCloseFileEditor (e) {
  // update the UI
  filesBrowser.isEditMode = false
  render()

  // restore the editor to non-edit mode
  var currentNode = filesBrowser.getCurrentSource()
  if (currentNode) {
    setAceValue(currentNode.preview)
    configureAce({readOnly: true})
  }
}

async function onSaveFileEditorContent (e) {
  try {
    var fileContent = getAceValue()
    var currentNode = filesBrowser.getCurrentSource()
    if (!currentNode) return
    currentNode.preview = fileContent

    // write to the target filename
    var fileName = e.detail.fileName || currentNode.name
    var filePath = joinPaths(currentNode.parent ? currentNode.parent._path : '', fileName)
    if (!filePath.startsWith('/')) {
      filePath = '/' + filePath
    }
    suppressFileChangeEvents = (filePath !== currentNode._path)
    await workingCheckout.writeFile(filePath, fileContent, 'utf8')

    if (filePath !== currentNode._path) {
      // go to the new path
      window.history.pushState('', {}, `beaker://library/${archive.url + filePath}`)
      await readViewStateFromUrl()

      // delete the old file
      await workingCheckout.unlink(currentNode._path)
    }
    toast.create('Saved')
  } catch (e) {
    toast.create(e.toString(), 'error', 5e3)
  }
  suppressFileChangeEvents = false
}

function onConfigFileEditor (e) {
  configureAce(e.detail)
}

function onFocusTitleEditor () {
  document.querySelector('input.title').focus()
  document.querySelector('input.title').select()
}

function onClickHeaderTitle (e) {
  if (!_get(archive, 'info.isOwner')) {
    return
  }

  // enter edit mode
  e.stopPropagation()
  headerEditValues.title = archive.info.title || 'Untitled'
  render()

  // select the text in the input
  var input = document.querySelector('.header-title-input')
  input.focus()
  input.select()
}

function onChangeHeaderEditor (e, name) {
  headerEditValues[name] = e.target.value

  if (e.key === 'Enter') {
    // save if it changed
    headerEditValues[name] = false
    if (e.target.value != archive.info.manifest[name]) {
      setManifestValue(name, e.target.value)
    } else {
      render()
    }
    return
  }
  if (e.key === 'Escape') {
    headerEditValues[name] = false
    render()
  }
}

function onBlurHeaderEditor (e, name) {
  // save if it changed
  if (headerEditValues[name] !== false && headerEditValues[name] != archive.info.manifest[name]) {
    setManifestValue(name, headerEditValues[name])
  }
}

function onSyncPathContextMenu (e) {
  e.preventDefault()
  e.stopPropagation()

  const rect = e.currentTarget.getClientRects()[0]
  const syncPath = _get(archive, 'info.userSettings.localSyncPath')
  contextMenu.create({
    x: rect.right + 5,
    y: rect.bottom + 10,
    right: true,
    withTriangle: true,
    items: [
      {icon: 'folder-o', label: 'Open folder', click: () => onOpenFolder(syncPath)},
      {icon: 'clipboard', label: 'Copy path', click: () => {
        writeToClipboard(syncPath)
        toast.create('Path copied to clipboard')
      }},
      {icon: 'wrench', label: 'Configure', click: () => onChangeView(null, 'settings') }
    ]
  })
}

function isLocalPathPromptDismissed () {
  return localStorage['local-path-prompt-dismissed:' + archive.key] === '1'
}

function setLocalPathPromptDismissed () {
  localStorage['local-path-prompt-dismissed:' + archive.key] = '1'
}

function onDismissLocalPathPrompt (e) {
  e.preventDefault()
  setLocalPathPromptDismissed()

  // trigger a dismiss animation
  var el = document.getElementById('local-path-and-preview-tools')
  if (!el) return
  el.style.opacity = 0
  setTimeout(() => el.remove(), 200)
}

async function onFilesChanged () {
  if (suppressFileChangeEvents) return

  // update files
  const currentNode = filesBrowser.getCurrentSource()
  if (!currentNode) return
  try {
    currentNode.preview = undefined // have the preview reload
    await currentNode.readData()
    if (!filesBrowser.isEditMode && !!currentNode.preview) {
      setAceValue(currentNode.preview) // update the editor if not in edit mode
    }
    filesBrowser.rerender()
  } catch (e) {
    console.debug('Failed to rerender files on change, likely because the present node was deleted', e)
  }

  // update the diff summary
  loadDiffSummary()

  // update readme
  loadReadme()
}

function onScrollMain (e) {
  var el = document.querySelector('.nav-archive-title')
  if (isNavCollapsed()) {
    el.classList.add('visible')
  } else {
    el.classList.remove('visible')
  }
}

async function onArchiveUpdated (e) {
  if (e.details.url === archive.checkout().url) {
    const isOwner = _get(archive, 'info.isOwner')
    const isSavedChanged = ('isSaved' in e.details && e.details.isSaved !== _get(archive, 'info.userSettings.isSaved'))
    const previewModeChanged = ('previewMode' in e.details && e.details.previewMode !== _get(archive, 'info.userSettings.previewMode'))

    // HACK
    // if previewMode or isSaved has changed, we need to reload so that the page can be constructed correctly
    // this totally sucks and is 100% technical debt
    // -prf
    if (isOwner && (isSavedChanged || previewModeChanged)) {
      // go to the files view, for now
      window.location = `beaker://library/${archive.checkout().url}`
      return
    }
    await archive.setup()
    if (workingCheckout && workingCheckout !== archive) {
      // copy over updates
      Object.assign(workingCheckout.info, archive.info)
      Object.assign(filesBrowser.root._archiveInfo, archive.info)
    }
    render()
  }
}

function onNetworkChanged (e) {
  if (e.details.url === archive.checkout().url) {
    var now = Date.now()
    archive.info.peerInfo = e.details.peers
    archive.info.peers = e.details.connections
    var lastHistory = archive.info.peerHistory.slice(-1)[0]
    if (lastHistory && (now - lastHistory.ts) < 10e3) {
      // if the last datapoint was < 10s ago, just update it
      lastHistory.peers = e.details.connections
    } else {
      archive.info.peerHistory.push({ts: now, peers: e.details.connections})
    }
    render()
  }
}

function onFolderSyncError (e) {
  if (e.details.url === archive.url) {
    console.error('Sync error', e.details.name, e.details.message)
    let cyclePath = (e.details.message || '').split(' ').pop() || 'one of the folders'
    noticeBanner.create('error', yo`
      <div>
        <strong>There was an issue</strong> while writing data from the local folder.
        Beaker detected a cyclical symlink at <code>${cyclePath}</code> and had to abort.
      </div>`
    )
    render()
  }
}

function onClickAnywhere (e) {
  // abort header title inline edit
  if (headerEditValues.title !== false) {
    if (!findParent(e.target, 'header-title-input')) { // not a click in the input
      headerEditValues.title = false
      render()
    }
  }
}

function onPopState (e) {
  readViewStateFromUrl()
}

// helpers
// =

// this method is only called on initial load and on the back button
// it mimics some of the behaviors of the click functions
//   (eg onChangeView and the files-browser onClickNode)
// but it works entirely by reading the current url
async function readViewStateFromUrl () {
  // active view
  let triggerSetup = false
  let oldView = activeView
  let hash = window.location.hash
  if (hash.startsWith('#')) hash = hash.slice(1)
  if (hash === 'setup') {
    activeView = 'files'
    triggerSetup = true
    history.replaceState('', document.title, window.location.pathname) // remove #setup in case the user reloads
  } else if (hash) {
    activeView = hash
  } else {
    activeView = 'files'
  }
  if (oldView !== activeView) {
    render()
  }

  try {
    var node
    var datUrl = await parseLibraryUrl()
    var urlp = parseDatURL(datUrl)
    var pathParts = decodeURIComponent(urlp.pathname).split('/').filter(Boolean)

    // select the archive
    node = archiveFsRoot
    await node.readData({maxPreviewLength: 1e5})

    // now select the folders
    let pathPart
    while ((pathPart = pathParts.shift())) {
      node = node.children.find(node => node.name === pathPart)
      if (!node) break
      if (node.type !== 'file') {
        // dont read for files, just folders
        // (that way we dont get stalled loading the preview)
        await node.readData()
      }
    }

    await filesBrowser.setCurrentSource(node, {suppressEvent: true})
    loadReadme()
    setupAce({readOnly: true}) // initialize ace editor (if needed)
  } catch (e) {
    // ignore, but log just in case something is buggy
    console.debug(e)
  }

  if (triggerSetup) {
    document.querySelector('.library-view-header .title h1').click()
  }
}

async function setManifestValue (attr, value) {
  try {
    var archiveLatest = archive.checkout()
    value = value || ''
    if (attr === 'paymentLink') {
      archive.info.links.payment = [{href: value, type: 'text/html'}]
      await archiveLatest.configure({links: archive.info.links})
    } else {
      Object.assign(archive.info, {[attr]: value})
      Object.assign(archive.info.manifest, {[attr]: value})
      await archiveLatest.configure({[attr]: value})
    }
    document.title = `Library - ${_get(archive, 'info.title', 'Untitled')}`
    render()
  } catch (e) {
    toast.create(e.toString(), 'error', 5e3)
  }
}

function isNavCollapsed ({ignoreScrollPosition} = {}) {
  if (!ignoreScrollPosition) {
    var main = document.body.querySelector('.builtin-main')
    var hasDescription = (!!_get(archive, 'info.description')) ? 1 : 0
    if (main && main.scrollTop >= MIN_SHOW_NAV_ARCHIVE_TITLE[hasDescription]) {
      // certain distance scrolled
      return true
    }
  }
  return false
}

function getSafeTitle () {
  return _get(archive, 'info.title', '').trim() || 'Untitled'
}

function getSafeDesc () {
  return _get(archive, 'info.description', '').trim() || yo`<em>No description</em>`
}

function markdownHrefMassager (href) {
  var isRelative = href.startsWith('/') || href.startsWith('./')
  if (!isRelative && href.indexOf(':') === -1) {
    isRelative = true
  }
  if (isRelative) {
    if (href.startsWith('./')) href = href.slice(2)
    if (href.startsWith('/')) href = href.slice(1)
    return `beaker://library/${archive.url}/${href}`
  }
  return href
}

async function parseLibraryUrl () {
  return window.location.pathname.slice(1)
}

function createToplevelError (err) {
  switch (err.name) {
    case 'TimeoutError':
      return yo`
        <div>
          <strong>Archive not found.</strong> Check your connection and make sure the archive is currently being seeded.
        </div>`
    case 'InvalidDomainName':
      return yo`
        <div>
          <strong>Archive not found.</strong> Could not find an archive at '${archive.url.slice('dat://'.length)}'.
        </div>`
    default:
      return err.toString()
  }
}
