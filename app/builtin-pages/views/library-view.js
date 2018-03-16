/* globals DatArchive beaker */

import yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'
import {FSArchive} from 'beaker-virtual-fs'
import {Archive as LibraryDatArchive} from 'builtin-pages-lib'
import parseDatURL from 'parse-dat-url'
import _get from 'lodash.get'
import dragDrop from 'drag-drop'
import FilesBrowser from '../com/files-browser2'
import renderDiff from '../com/diff'
import toggleable from '../com/toggleable'
import renderPeerHistoryGraph from '../com/peer-history-graph'
import * as toast from '../com/toast'
import * as workspacePopup from '../com/library-workspace-popup'
import * as copydatPopup from '../com/library-copydat-popup'
import * as contextInput from '../com/context-input'
import * as faviconPicker from '../com/favicon-picker'
import {pluralize, shortenHash} from '../../lib/strings'
import {throttle} from '../../lib/functions'
import {niceDate} from '../../lib/time'
import {writeToClipboard, findParent} from '../../lib/fg/event-handlers'
import createMd from '../../lib/fg/markdown'
import {IS_GIT_URL_REGEX} from '../../lib/const'

// globals
// =

var activeView // will default to 'files'
var archive
var archiveFsRoot
var filesBrowser
var workspaceInfo

var markdownRenderer = createMd()
var readmeElement

// current values being edited in settings
// false means not editing
var settingsEditValues = {
  title: false,
  description: false,
  repository: false
}
var settingsSuccess = {
  title: false,
  description: false,
  repository: false
}
var headerEditValues = {
  title: false
}

var toplevelError
var copySuccess = false
var isFaviconSet = true
var isGettingStartedDismissed = false
var arePeersCollapsed = true
var faviconCacheBuster
var workspaceFileActStream

// HACK
// Linux is not capable of importing folders and files in the same dialog
// unless we create our own import dialog (FFS!) we just need to change
// behavior based on which platform we're on. This flag tracks that.
// -prf
window.OS_CAN_IMPORT_FOLDERS_AND_FILES = true

// main
// =

setup()
async function setup () {
  // setup dragdrop
  dragDrop(document.body, onDropFiles)

  try {
    // load platform info
    let browserInfo = await beaker.browser.getInfo()
    window.OS_CAN_IMPORT_FOLDERS_AND_FILES = browserInfo.platform !== 'linux'

    // load data
    let url = await parseLibraryUrl()
    archive = new LibraryDatArchive(url)
    await archive.setup()

    // go to raw key if we have a shortname
    // (archive.info.url is always the raw url, while archive.url will reflect the given url)
    if (archive.url.startsWith(archive.info.url) === false) {
      window.location = 'beaker://library/' + archive.info.url
      return
    }

    document.title = `Library - ${archive.info.title || 'Untitled'}`

    // construct files browser
    archiveFsRoot = new FSArchive(null, archive, archive.info)
    filesBrowser = new FilesBrowser(archiveFsRoot)
    filesBrowser.onSetCurrentSource = onSetCurrentSource

    // set up download progress
    if (!_get(archive, 'info.isOwner')) {
      await archive.startMonitoringDownloadProgress()
    }

    // fetch workspace info for this archive
    try {
      workspaceInfo = await beaker.workspaces.get(0, archive.info.url)
      if (workspaceInfo) workspaceInfo.revisions = []
      filesBrowser.setWorkspaceInfo(workspaceInfo)
      await loadWorkspaceRevisions()
    } catch (e) {
      // suppress ArchiveNotWritableError, that is emitted if the dat is deleted
      if (e.name !== 'ArchiveNotWritableError') {
        throw e
      }
    }

    // check if the favicon is set
    isGettingStartedDismissed = (localStorage[archive.info.key + '-gsd'] === '1')
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

    // wire up events
    window.addEventListener('popstate', onPopState)
    document.body.addEventListener('click', onClickAnywhere)
    archive.progress.addEventListener('changed', render)
    document.body.addEventListener('custom-add-file', onAddFile)
    document.body.addEventListener('custom-rename-file', onRenameFile)
    document.body.addEventListener('custom-delete-file', onDeleteFile)
    document.body.addEventListener('custom-set-view', onChangeView)
    beaker.archives.addEventListener('network-changed', onNetworkChanged)
    setupWorkspaceListeners()

    let onFilesChangedThrottled = throttle(onFilesChanged, 1e3)
    var fileActStream = archive.createFileActivityStream()
    fileActStream.addEventListener('invalidated', onFilesChangedThrottled)
    fileActStream.addEventListener('changed', onFilesChangedThrottled)
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

function setupWorkspaceListeners () {
  if (workspaceFileActStream) {
    workspaceFileActStream.close()
  }

  if (workspaceInfo) {
    workspaceFileActStream = beaker.workspaces.createFileActivityStream(0, workspaceInfo.name)
    let onWorkspaceChangedThrottled = throttle(onWorkspaceChanged, 1e3)
    workspaceFileActStream.addEventListener('changed', onWorkspaceChangedThrottled)
  }
}

async function loadWorkspaceRevisions () {
  if (!workspaceInfo) return

  // load up the revision list
  if (!workspaceInfo.localFilesPathIsMissing) {
    workspaceInfo.revisions = await beaker.workspaces.listChangedFiles(
      0,
      workspaceInfo.name,
      {shallow: true, compareContent: true}
    )
  } else {
    workspaceInfo.revisions = []
  }

  // load and expand the first three revisions
  await Promise.all(workspaceInfo.revisions.slice(0, 3).map(async rev => {
    await loadDiff(rev)
    rev.isOpen = true
  }))

  // count the number of additions, deletions, and modifications
  // TODO i don't know if this is necessary
  workspaceInfo.additions = workspaceInfo.revisions.filter(r => r.change === 'add')
  workspaceInfo.modifications = workspaceInfo.revisions.filter(r => r.change === 'mod')
  workspaceInfo.deletions = workspaceInfo.revisions.filter(r => r.change === 'del')

  // TODO
  // unset diff node if removed from revisions
  // if (currentDiffNode) {
  //   if (!workspaceInfo.revisions.find(r => r.path === currentDiffNode.path)) {
  //     currentDiffNode = null
  //   }
  // }
}

async function loadDiff (revision) {
  if (!revision) return

  // fetch the diff
  try {
    revision.diff = await beaker.workspaces.diff(0, workspaceInfo.name, revision.path)

    revision.diffDeletions = revision.diff.reduce((sum, el) => {
      if (el.removed) return sum + el.count
      return sum
    }, 0)

    revision.diffAdditions = revision.diff.reduce((sum, el) => {
      if (el.added) return sum + el.count
      return sum
    }, 0)
  } catch (e) {
    if (e.invalidEncoding) {
      revision.diff = {invalidEncoding: true}
    } else if (e.sourceTooLarge) {
      revision.diff = {sourceTooLarge: true}
    } else {
      console.error('Error running diff', e)
    }
  }
}

async function loadReadme () {
  readmeElement = null
  let readmeContent = null
  let readmeHeader = null

  const node = filesBrowser.getCurrentSource()
  if (node && node.hasChildren) {
    // try to find the readme.md file
    const readmeMdNode = node.children.find(n => (n._name || '').toLowerCase() === 'readme.md')
    if (readmeMdNode) {
      // render the element
      const readmeMd = await archive.readFile(readmeMdNode._path, 'utf8')
      readmeContent = yo`<div class="readme markdown"></div>`
      readmeContent.innerHTML = markdownRenderer.render(readmeMd)
      readmeHeader = yo`
        <div class="file-preview-header">
          <code class="path">${readmeMdNode.name}</code>
        </div>`
    } else {
      // try to find the readme file
      const readmeNode = node.children.find(n => (n._name || '').toLowerCase() === 'readme')
      if (readmeNode) {
        // render the element
        const readme = await archive.readFile(readmeNode._path, 'utf8')
        readmeContent = yo`<div class="readme plaintext">${readme}</div>`
        readmeHeader = yo`
          <div class="file-preview-header">
            <code class="path">${readmeNode.name}</code>
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
        <div id=${id} class="file-preview-container readme">
          ${readmeHeader}
          ${readmeContent}
        </div>`
    }
  }

  render()
}

// rendering
// =

function render () {
  if (!archive) {
    yo.update(
      document.querySelector('.library-wrapper'), yo`
        <div class="library-wrapper library-view builtin-wrapper">
          <div class="builtin-main" style="margin-left: 0; width: 100%">
            <div class="view-wrapper">
              ${renderView()}
            </div>
          </div>
        </div>`
      )
  } else {
    yo.update(
      document.querySelector('.library-wrapper'), yo`
        <div class="library-wrapper library-view builtin-wrapper">
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

          <div class="builtin-main" style="margin-left: 0; width: 100%">
            ${renderHeader()}

            <div class="view-wrapper">
              ${renderView()}
            </div>

            ${renderFooter()}
          </div>
        </div>
      `
    )
  }
}

function renderHeader () {
  const isOwner = _get(archive, 'info.isOwner')
  return yo`
    <div class="builtin-header">
      <div class="container">
        <a href="beaker://library" class="back-link">
          <i class="fa fa-angle-double-left"></i>
        </a>

        ${renderTabs()}

        ${isOwner
          ? yo`
            <div
              class="favicon-container editable tooltip-container ${isFaviconSet ? '' : 'unset'}"
              data-tooltip=${isFaviconSet ? 'Change favicon' : 'Set favicon'}
              onclick=${onClickFavicon}>

              ${isFaviconSet
                ? yo`<img src="beaker-favicon:${archive.url}?cache=${faviconCacheBuster}" />`
                : yo`<i class="fa fa-plus"></i>`
              }
            </div>`
          : yo`
            <div class="favicon-container">
              <img src="beaker-favicon:${archive.url}?cache=${faviconCacheBuster}" />
            </div>`
        }

        ${isOwner
          ? (headerEditValues.title !== false)
            ? yo`<input class="title" value=${headerEditValues.title} onkeyup=${e => onKeyupHeaderEdit(e, 'title')} placeholder="Title" />`
            : yo`
              <div class="tooltip-container" data-tooltip="Change title">
                <button class="title editable nofocus" onclick=${onClickChangeHeaderTitle}>
                  ${getSafeTitle()}
                </button>
              </div>`
          : yo`
            <a href=${archive.url} class="title" target="_blank">
              ${getSafeTitle()}
            </a>`
        }

        <a href=${archive.url} class="url" target="_blank">
          ${shortenHash(archive.url)}
        </a>

        <button class="btn plain tooltip-container" data-tooltip="${copySuccess ? 'Copied' : 'Copy URL'}" onclick=${() => onCopy(archive.url, '', true)}>
          <i class="fa fa-link"></i>
        </button>
      </div>
    </div>`
}

function renderView () {
  if (toplevelError) {
    return renderErrorView()
  }

  switch (activeView) {
    case 'files':
      return renderFilesView()
    case 'settings':
      return renderSettingsView()
    case 'workspace':
      return renderWorkspaceView()
    case 'network':
      return renderNetworkView()
    case 'preview':
      return renderPreviewView()
    default:
      return yo`<div class="view">Loading...</div>`
  }
}

function renderFooter () {
  let secondaryAction = ''
  let primaryAction = ''
  if (archive && archive.info) {
    primaryAction = yo`
      <div class="btn-group">
        ${renderEditButton()}
        ${renderMenu()}
      </div>`

    // pick secondary action based on current state
    if (workspaceInfo && workspaceInfo.localFilesPath) {
      secondaryAction = toggleable(yo`
        <div class="dropdown toggleable-container">
          <button class="btn transparent nofocus toggleable">
            ${workspaceInfo.localFilesPath} <i class="fa fa-caret-up"></i>
          </button>

          <div class="dropdown-items workspace-info top right subtle-shadow">
            <div class="dropdown-item" onclick=${() => onOpenFolder(workspaceInfo.localFilesPath)}>
              <i class="fa fa-folder-o"></i>
              <span class="label">Open ${workspaceInfo.localFilesPath}</span>
            </div>

            <div class="dropdown-item" onclick=${onChangeWorkspaceDirectory}>
              <i class="fa fa-pencil"></i>
              <span class="label">Change workspace directory</span>
            </div>

            <div class="dropdown-item" onclick=${() => onCopy(workspaceInfo.localFilesPath, 'Path copied to clipboard')}>
              <i class="fa fa-clipboard"></i>
              <span class="label">Copy path</span>
            </div>
          </div>
        </div>`)
    } else if (workspaceInfo && workspaceInfo.localFilesPathIsMissing) {
      secondaryAction = yo`
        <span class="path error">
          <em>
            Directory not found
            ${workspaceInfo.missingLocalFilesPath
              ? `(${workspaceInfo.missingLocalFilesPath})`
              : ''
            }
          </em>
        </span>`
    } else if (!_get(archive, 'info.userSettings.isSaved')) {
      if (_get(archive, 'info.isOwner')) {
        secondaryAction = yo`
          <button class="btn" onclick=${onSave}>
            Restore from Trash
          </button>`
      } else {
        secondaryAction = yo`
          <button class="btn success" onclick=${onToggleSeeding}>
            <i class="fa fa-arrow-up"></i>
            <span>Seed these files</span>
          </button>`
      }
    } else if (_get(archive, 'info.isOwner') && (!workspaceInfo || !workspaceInfo.localFilesPath)) {
      secondaryAction = ''
    } else {
      secondaryAction = yo`
        <button class="btn" onclick=${onToggleSeeding}>
          <i class="fa fa-pause"></i>
          <span>Stop seeding</span>
        </button>`
    }
  }

  return yo`
    <footer>
      <div class="container">
        <div class="metadata">
          <span>${prettyBytes(_get(archive, 'info.size', 0))}</span>
          <span class="separator">―</span>
          <span>${_get(archive, 'info.peers', 0)} ${pluralize(_get(archive, 'info.peers', 0), 'peer')}</span>
        </div>

        <div class="secondary-action">
          ${_get(archive, 'info.isOwner') ? '' : yo`<em>Read-only</em>`}
        </div>
        <div class="secondary-action">
          ${secondaryAction}
        </div>
        ${primaryAction}
      </div>
    </footer>
  `
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
        ${workspaceInfo && workspaceInfo.localFilesPathIsMissing
          ? yo`
            <div class="message info">
              <span>
                This archive${"'"}s workspace directory
                ${workspaceInfo.missingLocalFilesPath ? `(${workspaceInfo.missingLocalFilesPath})` : ''}
                was moved or deleted.
              </span>

              <button class="btn" onclick=${onChangeWorkspaceDirectory}>Choose new directory</button>
            </div>`
          : ''
        }

        ${archive.info.isOwner && !archive.info.userSettings.isSaved
          ? yo`
            <div class="message error">
              <span>
                ${archive.info.title ? archive.info.title : 'This archive'}
                is in your Trash.
              </span>
              <button class="btn" onclick=${onSave}>Restore from Trash</button>
            </div>`
          : ''
        }
        ${archive.info.isOwner ? renderSetupChecklist() : ''}
        ${filesBrowser ? filesBrowser.render() : ''}
        ${readmeElement ? readmeElement : renderReadmeHint()}
        ${readmeElement && workspaceInfo && workspaceInfo.localFilesPath
          ? renderWorkspaceHint()
          : ''
        }
        ${!archive.info.isOwner ? renderMakeCopyHint() : ''}
      </div>
    </div>
  `
}

function renderWorkspaceHint () {
  return yo`
    <div class="hint">
      <p>
        <i class="fa fa-code"></i>
        Changes to the files in
        <span class="link" onclick=${() => onOpenFolder(workspaceInfo.localFilesPath)}>
          ${workspaceInfo.localFilesPath}
        </span>
        will show up in the <span class="link" onclick=${e => onChangeView(e, 'workspace')}>Workspace</span>
        tab.
      </p>
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
  if (!archive.info.isOwner) return ''
  if (filesBrowser.getCurrentSource().parent) return '' // only at root

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

function renderSetupChecklist () {
  const hasTitle = _get(archive, 'info.title').trim()
  const hasWorkspaceDirectory = workspaceInfo && workspaceInfo.localFilesPath
  const hasFavicon = isFaviconSet

  if (isGettingStartedDismissed) return ''
  if (hasTitle && hasWorkspaceDirectory && hasFavicon) return ''

  return yo`
    <div class="setup-info">
      <h2 class="lined-heading">
        <i class="fa fa-magic"></i>
        Getting started
        <button class="btn plain lined-heading-action" title="Dismiss" onclick=${onDismissGettingStarted} data-tooltip="Dismiss">
          <i class="fa fa-times"></i>
        </button>
      </h2>

      <div class="setup-checklist">
        <div class="checklist-item">
          <h3 class="label">
            <i class="fa fa-font"></i>
            Set a title
            ${hasTitle ? yo`<i class="fa fa-check"></i>` : ''}
          </h3>

          <p class="description">
            Give your project a title to help people find it.
          </p>

          <div class="actions">
            <button class="btn" onclick=${onClickChangeHeaderTitle}>
              ${hasTitle ? 'Change' : 'Set'} title
            </button>
          </div>
        </div>

        <div class="checklist-item">
          <h3 class="label">
            <i class="fa fa-file-image-o"></i>
            Add a favicon
            ${hasFavicon ? yo`<i class="fa fa-check"></i>` : ''}
          </h3>

          <p class="description">
            Choose an image to use as this project${"'"}s favicon.
          </p>

          <div class="actions">
            <button class="btn" onclick=${onClickFavicon}>
              Pick a favicon
            </button>

            <a class="learn-more-link" href="https://developer.mozilla.org/en-US/docs/Learn/HTML/Introduction_to_HTML/The_head_metadata_in_HTML#Adding_custom_icons_to_your_site" target="_blank">
              What${"'"}s a favicon?
            </a>
          </div>
        </div>

        <div class="checklist-item">
          <h3 class="label">
            <i class="fa fa-code"></i>
            ${hasWorkspaceDirectory ? 'Workspace' : 'Set workspace'} directory
            ${hasWorkspaceDirectory ? yo`<i class="fa fa-check"></i>` : ''}
          </h3>

          <p class="description">
            ${hasWorkspaceDirectory
              ? `These files are saved at ${workspaceInfo.localFilesPath}.`
              : 'Choose where to save this project\'s files.'
            }
          </p>

          <button class="btn" onclick=${onChangeWorkspaceDirectory}>
            ${hasWorkspaceDirectory ? 'Change' : 'Set'} directory
          </button>
        </div>
      </div>
    </div>
  `
}

function renderSettingsView () {
  const title = archive.info.title || ''
  const editedTitle = settingsEditValues['title']
  const isEditingTitle = editedTitle !== false && title !== editedTitle

  const description = archive.info.description || ''
  const editedDescription = settingsEditValues['description']
  const isEditingDescription = editedDescription !== false && description !== editedDescription

  const gitRepository = archive.info.manifest.repository || ''
  const editedGitRepository = settingsEditValues['repository']
  const isEditingGitRepository = editedGitRepository !== false && gitRepository !== editedGitRepository

  const isOwner = _get(archive, 'info.isOwner')

  let wsPath = workspaceInfo && workspaceInfo.localFilesPath
  if (wsPath && wsPath.indexOf(' ') !== -1) wsPath = `"${wsPath}"`

  let wsDirectoryHeading = ''
  let wsDirectoryDescription = ''
  if (workspaceInfo && workspaceInfo.localFilesPath) {
    wsDirectoryHeading = yo`<h3 class="no-margin">Workspace directory</h3>`
    wsDirectoryDescription = yo`
      <p>
        This project${"'"}s files are saved on your computer at
        <span class="link" onclick=${() => onOpenFolder(workspaceInfo.localFilesPath)}>
          ${workspaceInfo.localFilesPath}
        </span>

        <button class="btn plain tooltip-container" data-tooltip="${copySuccess ? 'Copied' : 'Copy path'}" onclick=${() => onCopy(workspaceInfo.localFilesPath, '',  true)}>
          <i class="fa fa-clipboard"></i>
        </button>

        <form class="input-group">
          <input disabled type="text" value=${workspaceInfo.localFilesPath} placeholder="Change workspace directory"/>
          <button type="button" class="btn" onclick=${onChangeWorkspaceDirectory}>
            Change workspace directory
          </button>
        </form>
      </p>`
  } else if (workspaceInfo && workspaceInfo.localFilesPathIsMissing) {
    wsDirectoryHeading = yo`
      <h3 class="no-margin">
        Workspace directory
        <i class="fa fa-exclamation-circle"></i>
      </h3>`

    wsDirectoryDescription = yo`
      <p>
        <em>
          This project${"'"}s workspace directory was deleted or moved. (${workspaceInfo.missingLocalFilesPath})
        </em>

        <form>
          <button type="button" class="btn" onclick=${onChangeWorkspaceDirectory}>
            Choose new directory
          </button>
        </form>
      </p>`
  } else {
    wsDirectoryHeading = yo`<h3 class="no-margin">Set up workspace directory</h3>`
    wsDirectoryDescription = yo`
      <p>
        Choose the directory where this project${"'"}s files will be saved.

        <form>
          <button type="button" class="btn" onclick=${onChangeWorkspaceDirectory}>
            Set workspace directory
          </button>
        </form>
      </p>`
  }

  return yo`
    <div class="container">
      <div class="settings view">
        <div class="module">
          <h2 class="module-heading">
            <span>
              <i class="fa fa-info-circle"></i>
              General
            </span>
          </h2>

          <div class="module-content bordered">

            <h3 class="no-margin">Title</h3>
            ${isOwner
              ? yo`
                <form class="input-group">
                  <input type="text" name="title" value=${isEditingTitle ? editedTitle : title} onkeyup=${e => onKeyupSettingsEdit(e, 'title')} placeholder="Set title">
                  <button disabled="${!isEditingTitle}" class="btn" onclick=${e => onSaveSettingsEdit(e, 'title')}>
                    Save
                  </button>
                  ${settingsSuccess['title']
                    ? yo`
                      <span class="success-message">
                        <i class="fa fa-check"></i>
                      </span>`
                    : ''
                  }
                </form>`
              : yo`<p>${getSafeTitle()}</p>`
            }

            <h3>Description</h3>
            ${isOwner
              ? yo`
                <form class="input-group">
                  <input type="text" name="description" value=${isEditingDescription ? editedDescription : description} onkeyup=${e => onKeyupSettingsEdit(e, 'description')} placeholder="Set description"/>
                  <button disabled="${!isEditingDescription}" class="btn" onclick=${e => onSaveSettingsEdit(e, 'description')}>
                    Save
                  </button>
                  ${settingsSuccess['description']
                    ? yo`
                      <span class="success-message">
                        <i class="fa fa-check"></i>
                      </span>`
                    : ''
                  }
                </form>`
              : yo`<p>${getSafeDesc()}</p>`
            }

            <h3>Favicon</h3>

            ${isOwner
              ? yo`
                <p class="input-group">
                  <img class="favicon" src="beaker-favicon:32,${archive.url}?cache=${faviconCacheBuster}"/>
                  <button class="btn" onclick=${onClickFavicon}>
                    Change favicon
                  </button>
                  <a class="learn-more-link" href="https://developer.mozilla.org/en-US/docs/Learn/HTML/Introduction_to_HTML/The_head_metadata_in_HTML#Adding_custom_icons_to_your_site" target="_blank">
                    What${"'"}s a favicon?
                  </a>
                </p>`
              : yo`<img class="favicon" src="beaker-favicon:32,${archive.url}?cache=${faviconCacheBuster}"/>`
            }
          </div>
        </div>

        ${isOwner
          ? yo`
            <div class="module">
              <h2 class="module-heading">
                <span>
                  <i class="fa fa-code"></i>
                  Workspace settings
                </span>
              </h2>

              <div class="module-content bordered">
                <div>
                  ${wsDirectoryHeading}
                  ${wsDirectoryDescription}

                  ${workspaceInfo
                    ? yo`
                      <div>
                        <h3>Local preview URL</h3>

                        <p>
                          Preview unpublished changes at
                          <a href="workspace://${workspaceInfo.name}">workspace://${workspaceInfo.name}</a>

                          <button class="btn plain tooltip-container" data-tooltip="${copySuccess ? 'Copied' : 'Copy URL'}" onclick=${() => onCopy(`workspace://${workspaceInfo.name}`, '',  true)}>
                            <i class="fa fa-clipboard"></i>
                          </button>
                        </p>

                        <h3>Published URL</h3>

                        <p>
                          Published changes are shared on network at
                          <a href=${archive.url} target="_blank">${shortenHash(archive.url)}</a>

                          <button class="btn plain tooltip-container" data-tooltip="${copySuccess ? 'Copied' : 'Copy URL'}" onclick=${() => onCopy(archive.url, '', true)}>
                            <i class="fa fa-clipboard"></i>
                          </button>
                        </p>
                      </div>`
                    : ''
                  }
                </div>
              </div>
            </div>`
          : ''
        }

        <div class="module coming-soon">
          <h2 class="module-heading">
            <span>
              <i class="fa fa-git"></i>
              Git integration
            </span>
          </h2>

          <div class="module-content bordered">
            ${_get(archive, 'info.isOwner')
              ? yo`
                <div>
                  <p>
                    Set a <a href="https://git-scm.com/" target="_blank">Git</a> repository so people can find
                    and contribute to the source code for this project.

                    <form class="input-group">
                      <input
                        type="text"
                        name="repository"
                        value=${isEditingGitRepository ? editedGitRepository : gitRepository}
                        placeholder="Example: https://github.com/beakerbrowser/beaker.git"
                        onkeyup=${e => onKeyupSettingsEdit(e, 'repository')} />
                      <button class="btn" disabled=${!isEditingGitRepository} onclick=${e => onSaveSettingsEdit(e, 'repository')}>
                        Save
                      </button>
                      ${settingsSuccess['repository']
                        ? yo`
                          <span class="success-message">
                            <i class="fa fa-check"></i>
                          </span>`
                        : ''
                      }
                    </form>
                  </p>
                </div>`
              : yo`
                ${archive.info.repository
                  ? yo`
                    <p>
                      Find the source code for this project at <a href=${archive.info.repository} target="_blank">${archive.info.repository}</a>.
                    </p>`
                  : yo`<em class="empty">This project${"'"}s author has not set a Git repository.</em>`
                }
              `
            }

            <p class="hint">
              <i class="fa fa-question-circle-o"></i>
              New to Git? Check out <a href="https://try.github.io/levels/1/challenges/1" target="_blank">this tutorial</a> to
              learn about Git and version control.
            </p>
          </div>
        </div>

        ${''/* TODO archive.info.repository && wsPath
          ? yo`<div class="git-setup-commands">
            <h3>Setup the git repo in your workspace</h3>
<pre><code>cd ${wsPath}
git init
git remote add origin ${archive.info.repository}
git fetch
git reset origin/master</code></pre>
          ` : ''*/}
      </div>
    </div>
  `
}

function renderNetworkView () {
  let progressLabel = ''
  let progressCls = ''
  let seedingIcon = ''
  let seedingLabel = ''
  let clearCacheBtn = ''
  let peersLimit = 10

  const {isSaved, expiresAt} = archive.info.userSettings
  const {progress} = archive
  const progressPercentage = `${progress.current}%`
  let downloadedBytes = _get(archive, 'info.isOwner')
    ? archive.info.size
    : (archive.info.size / progress.blocks) * progress.downloaded

  if (isSaved) {
    if (progress.isComplete) {
      progressLabel = 'Seeding files'
      progressCls = 'green'
    } else {
      progressLabel = 'Downloading and seeding files'
      progessCls = 'green active'
    }
  } else if (progress.isComplete) {
    progressLabel = 'All files downloaded'
  } else {
    progressLabel = 'Idle'
  }

  if (!archive.info.isOwner) {
    clearCacheBtn = yo`
      <span>
        |
        <button class="link" onclick=${onDeleteDownloadedFiles}>
        Delete downloaded files
      </span>`
    if (isSaved) {
      seedingIcon = 'pause'
      seedingLabel = 'Stop seeding these files'
    } else {
      seedingIcon = 'arrow-up'
      seedingLabel = 'Seed these files'
    }
  }

  return yo`
    <div class="container">
      <div class="view network">
        <div class="module">
          <h2 class="module-heading">Network overview</h2>

          <div class="module-content">
            ${_get(archive, 'info.isOwner')
              ? ''
              : yo`<div>
                <h3 class="subtitle-heading">Download status</h3>

                <progress value=${progress.current} max="100">
                  ${progress.current}
                </progress>

                <div class="download-status">
                  <div class="progress-ui ${progressCls}">
                    <div style="width: ${progressPercentage}" class="completed">
                      ${progressPercentage}
                    </div>
                    <div class="label">${progressLabel}${clearCacheBtn}</div>
                  </div>

                  ${!archive.info.isOwner
                    ? yo`
                      <button class="btn transparent" data-tooltip=${seedingLabel} onclick=${onToggleSeeding}>
                        <i class="fa fa-${seedingIcon}"></i>
                      </button>`
                    : ''
                  }
                </div>
              </div>`
            }

            <h3 class="subtitle-heading">Peers</h3>
            ${!_get(archive, 'info.peers')
              ? yo`<em>No active peers</em>`
              : yo`
                <table>
                  <tr>
                    <th>
                      IP address
                      <i class="fa fa-question-circle-o"></i>
                    </th>
                  </tr>

                  ${_get(archive, 'info.peerInfo', []).slice(0, peersLimit).map(peer => {
                    return yo`
                      <tr class="ip-address">
                        <td>
                          ${peer.host}:${peer.port}
                        </td>
                      </tr>`
                  })}
                </table>`
            }

            ${Number(_get(archive, 'info.peers')) > peersLimit
              ? yo`
                <span class="link" onclick=${onTogglePeersCollapsed}>
                  ${arePeersCollapsed  ? 'Show all' : 'Show fewer'} peers
                  <i class="fa fa-angle-${arePeersCollapsed ? 'down' : 'up'}"></i>
                </span>`
              : ''
            }

            <p class="hint">
              <i class="fa fa-share-alt"></i>
              Peers help keep this project online by seeding its files.
            </p>

            <h3 class="subtitle-heading">Network activity (last hour)</h3>
            ${renderPeerHistoryGraph(archive.info)}

            <h3 class="subtitle-heading">Advanced</h3>
            <a href="beaker://swarm-debugger/${archive.key}">
              Open network debugger
            </a>
          </div>

          <div class="module-footer two">
            <div>
              ${downloadedBytes !== archive.info.size
                ? yo`
                  <div class="value">
                    ${prettyBytes(downloadedBytes)} / ${prettyBytes(archive.info.size)}
                  </div>`
                : yo`
                  <div class="value">
                    ${prettyBytes(downloadedBytes)}
                  </div>`
              }
              <div class="label">saved to your device</div>
            </div>

            <div>
              <div class="value">${archive.info.peers}</div>
              <div class="label">${pluralize(archive.info.peers, 'active peer')}</div>
            </div>
          </div>
        </div>

        ${!archive.info.isOwner && !isSaved
          ? yo`
            <div class="hint">
              <p>
                <i class="fa fa-heart-o"></i>
                <strong>Give back!</strong> Seed this project${"'"}s files to help keep them online.
              </p>

              <button class="btn" onclick=${onToggleSeeding}>
                Seed files
              </button>

              <a href="#todo" target="_blank" class="learn-more-link">Learn more</a>
            </div>`
          : ''
        }

        ${archive.info.isOwner
          ? yo`
            <div class="hint">
              <p>
                <i class="fa fa-signal"></i>
                <strong>Keep your files online.</strong> Share this project${"'"}s URL with friends, or with a public peer service like <a href="https://hashbase.io" target="_blank">Hashbase</a>.
              </p>

              <button class="btn" onclick=${() => onCopy(archive.url, 'URL copied to clipboard')}>
                Copy URL
              </button>

              <a href="#todo" target="_blank" class="learn-more-link">Learn more</a>
            </div>`
          : ''
        }
      </div>
    </div>
  `
}

function renderWorkspaceView () {
  if (!workspaceInfo) return ''

  if (workspaceInfo && workspaceInfo.localFilesPathIsMissing) {
    return yo`
      <div class="container">
        <div class="view revisions empty">
          <div class="label">Workspace directory moved or deleted</div>

          <p>
            This project${"'"}s workspace directory ${workspaceInfo.missingLocalFilesPath ? `(${workspaceInfo.missingLocalFilesPath})` : ''} was deleted
            or moved. <button class="link" onclick=${onChangeWorkspaceDirectory}>Choose a new workspace directory</button>
          </p>
        </div>
      </div>
    `
  }

  if (!workspaceInfo.revisions.length) {
    return yo`
      <div class="container">
        <div class="view revisions empty">
          <i class="fa fa-check"></i>

          <div class="label">All changes published</div>

          <p>
            The files in <span onclick=${() => onOpenFolder(workspaceInfo.localFilesPath)} class="link">${workspaceInfo.localFilesPath}</span>
            have been published to
            <a href=${archive.url} target="_blank">${shortenHash(archive.url)}</a>.
          </p>
        </div>
      </div>
    `
  }

  const renderRevisionContent = rev => {
    let el = ''

    if (!rev.isOpen) {
      return ''
    } else if (rev.diff && rev.diff.invalidEncoding) {
      el = yo`
        <div class="binary-diff-placeholder">
<code>1010100111001100
1110100101110100
1001010100010111</code>
          </div>`
    } else if (rev.type === 'dir') {
      const path = `${workspaceInfo.localFilesPath}${rev.path}`
      el = yo`
        <div class="folder">
          <i class="fa fa-folder-open-o"></i>
          <span class="action path" onclick=${() => onOpenFolder(path)}>
            Open folder
          </span>
          <p><code>${path}</code></p>
        </div>`
    } else if (rev.diff && rev.diff.sourceTooLarge) {
      el = yo`
        <div class="source-too-large">
          <a href="workspace://${workspaceInfo.name}${rev.path}" class="action" target="_blank">View file</a>
          <p>This diff is too large to display.</p>
        </div>`
    } else if (!(rev.diffAdditions || rev.diffDeletions)) {
      el = yo`
        <div class="empty">
          <i class="fa fa-code"></i>
          <p>Empty file</p>
        </div>
      `
    } else if (rev.diff) {
      el = renderDiff(rev.diff, rev.path)
    } else {
      el = yo`
        <div class="loading">
          <p>Loading diff...</p>
          <div class="spinner"></div>
        </div>`
    }

    return yo`<div class="revision-content">${el}</div>`
  }

  const renderRevision = rev => (
    yo`
      <li class="revision">
        <div class="revision-header ${rev.isOpen ? '' : 'collapsed'}" onclick=${() => onToggleRevisionCollapsed(rev)}>
          <div class="revision-type ${rev.change}"></div>

          <code class="path">
            ${rev.type === 'file' ? rev.path.slice(1) : rev.path}
          </code>

          ${rev.diffAdditions
            ? yo`<div class="changes-count additions">+${rev.diffAdditions}</div>`
            : ''
          }

          ${rev.diffDeletions
            ? yo`<div class="changes-count deletions">-${rev.diffDeletions}</div>`
            : ''
          }

          <div class="actions">
            <button
              class="ignore-btn btn plain"
              data-tooltip="Add to .datignore"
              onclick=${e => onAddToDatIgnore(e, rev)}
              >
              <i class="fa fa-eye-slash"></i>
            </button>

            <div class="btn-group">
              ${rev.change === 'del'
                ? ''
                : yo`
                  <a
                    onclick=${(e) => e.stopPropagation()}
                    href="workspace://${workspaceInfo.name}${rev.path}"
                    target="_blank"
                    class="btn"
                    data-tooltip="View file">
                    View
                  </a>`
              }

              <button class="btn" data-tooltip="Revert" onclick=${e => onRevertRevision(e, rev)}>
                <i class="fa fa-undo"></i>
              </button>

              <button class="btn" data-tooltip="Publish" onclick=${e => onPublishRevision(e, rev)}>
                <i class="fa fa-check"></i>
              </button>
            </div>

            <div class="btn plain">
              <i class="fa fa-chevron-${rev.isOpen ? 'down' : 'up'}"></i>
            </div>
          </div>
        </div>

        ${renderRevisionContent(rev)}
      </li>
    `
  )

  const revisions = workspaceInfo.revisions
  const {additions, modifications, deletions} = workspaceInfo

  return yo`
    <div class="container">
      <div class="view revisions">
        <div class="revisions-header">
          <span>Showing</span>

          ${additions.length
            ? yo`
              <span class="change-count">
                ${additions.length} ${pluralize(additions.length, 'addition')}
              </span>`
            : ''
          }

          ${additions.length && modifications.length ? ' , ' : ''}

          ${modifications.length
            ? yo`
              <span class="change-count">
                ${modifications.length} ${pluralize(modifications.length, 'modification')}
              </span>`
            : ''
          }

          ${modifications.length && deletions.length ? ' , ' : ''}

          ${deletions.length
            ? yo`
              <span class="change-count">
                ${deletions.length} ${pluralize(deletions.length, 'deletion')}
              </span>`
            : ''
          }

          <a href="workspace://${workspaceInfo.name}" target="_blank" class="btn preview-btn">
            <span>Local preview</span>
            <i class="fa fa-external-link"></i>
          </a>

          <div class="actions">
            <button class="btn plain" onclick=${onExpandAllRevisions}>
              <i class="fa fa-expand"></i>
              Expand all
            </button>

            <button class="btn" onclick=${e => onRevertAllRevisions(e)}>
              Revert all
            </button>

            <button class="btn success publish" onclick=${e => onPublishAllRevisions(e)}>
              Publish all
            </button>
          </div>
        </div>

        ${revisions.length
          ? yo`<ul class="revisions-list">${revisions.map(renderRevision)}</ul>`
          : ''
        }
      </div>
    </div>
  `
}

function renderTabs () {
  const isOwner = _get(archive, 'info.isOwner')
  const baseUrl = `beaker://library/${archive.url}`
  return yo`
    <div class="tabs">
      <a href=${baseUrl} onclick=${e => onChangeView(e, 'files')} class="tab ${activeView === 'files' ? 'active' : ''}">
        Files
      </a>

      ${workspaceInfo
        ? yo`
          <a href=${baseUrl + '#workspace'} onclick=${e => onChangeView(e, 'workspace')} class="tab ${activeView === 'workspace' ? 'active' : ''}">
            Workspace
            ${workspaceInfo.revisions && workspaceInfo.revisions.length
              ? yo`<span class="revisions-indicator"></span>`
              : ''
            }
          </a>`
        : ''
      }

      <a href=${baseUrl + '#network'} onclick=${e => onChangeView(e, 'network')} class="tab ${activeView === 'network' ? 'active' : ''}">
        Network
      </a>

      <a href=${baseUrl + '#settings'} onclick=${e => onChangeView(e, 'settings')} class="tab ${activeView === 'settings' ? 'active' : ''}">
        ${isOwner ? 'Settings' : 'Info'}
      </a>
    </div>
  `
}

function renderMenu () {
  const isOwner = _get(archive, 'info.isOwner')
  const isSaved = _get(archive, 'info.userSettings.isSaved')
  return toggleable(yo`
    <div class="dropdown toggleable-container">
      <button class="btn primary nofocus toggleable">
        <i class="fa fa-caret-up"></i>
      </button>

      <div class="dropdown-items top right subtle-shadow">
        ${isOwner
          ? yo`
            <div class="dropdown-item" onclick=${onMakeCopy}>
              <i class="fa fa-clone"></i>
              Make a copy
            </div>`
          : ''}

        ${workspaceInfo && isSaved
          ? yo`
            <div class="dropdown-item" onclick=${onChangeWorkspaceDirectory}>
              <i class="fa fa-folder-o"></i>
              ${workspaceInfo.localFilesPath ? 'Change' : 'Set'} workspace directory
            </div>`
          : ''
        }

        <div class="dropdown-item" onclick=${onDownloadZip}>
          <i class="fa fa-file-archive-o"></i>
          Download as .zip
        </div>

        ${isOwner
          ? (isSaved
            ? yo`
              <div class="dropdown-item" onclick=${onMoveToTrash}>
                <i class="fa fa-trash-o"></i>
                Move to Trash
              </div>`
            : [
              yo`
                <div class="dropdown-item" onclick=${onSave}>
                  <i class="fa fa-undo"></i>
                  Restore from Trash
                </div>`,
              yo`
                <div class="dropdown-item" onclick=${onDeletePermanently}>
                  <i class="fa fa-times-circle"></i>
                  Delete permanently
                </div>`
            ]
          ) : ''
        }
      </div>
    </div>
  `)
}

function renderEditButton () {
  if (workspaceInfo && workspaceInfo.localFilesPath) {
    return yo`
      <button class="btn primary nofocus" onclick=${() => onOpenFolder(workspaceInfo.localFilesPath)}>
        Open folder
      </button>
    `
  } else if (_get(archive, 'info.isOwner')) {
    return yo`
      <button class="btn primary nofocus" onclick=${onChangeWorkspaceDirectory}>
        Set workspace directory
      </button>`
  } else {
    return yo`
      <button class="btn primary nofocus" onclick=${onMakeCopy}>
        Make an editable copy
      </button>`
  }
}

function renderRepositoryLink () {
  if (!archive.info.manifest.repository) return ''
  let url = archive.info.manifest.repository
  if (url.startsWith('git@')) {
    // a GitHub ssh url, do a little transforming
    url = url.replace(':', '/')
    url = 'https://' + url.slice('git@'.length)
  }
  return yo`<a href=${url} target="_blank">${archive.info.manifest.repository}</a>`
}

// events
// =

function onTogglePeersCollapsed () {
  arePeersCollapsed = !arePeersCollapsed
  render()
}

async function onMakeCopy () {
  let {title} = await copydatPopup.create({archive})
  const fork = await DatArchive.fork(archive.url, {title, prompt: false}).catch(() => {})
  window.location = `beaker://library/${fork.url}`
}

async function addReadme () {
   const readme = `# ${archive.info.title || 'Untitled'}\n\n${archive.info.description || ''}`
  // write file to the dat then restore to the workspace
  await archive.writeFile('/README.md', readme)
  if (workspaceInfo && workspaceInfo.name) {
    await beaker.workspaces.revert(0, workspaceInfo.name, {paths: ['/README.md']})
  }
  await loadReadme()
  render()
}

async function onMoveToTrash () {
  const nickname = getSafeTitle()
  if (confirm(`Move ${nickname} to Trash?`)) {
    try {
      await beaker.archives.remove(archive.url)
      archive.info.userSettings.isSaved = false
    } catch (e) {
      console.error(e)
      toast.create(`Could not move ${nickname} to Trash`, 'error')
    }
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
  } catch (e) {
    console.error(e)
    toast.create(`Could not save ${nickname} to your Library`, 'error')
  }
  if (archive.info.isOwner) {
    await loadWorkspaceRevisions() // fetch any updates
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
  } catch (e) {
    console.error(e)
    toast.create(`Could not update ${nickname}`, 'error')
  }
  render()
}

async function onChangeView (e, view) {
  e.preventDefault()
  e.stopPropagation()

  // update state
  if (!view) {
    activeView = e.detail.view
    window.history.pushState('', {}, e.detail.href)
  } else {
    activeView = view
    window.history.pushState('', {}, e.currentTarget.getAttribute('href'))
  }

  if (activeView === 'files' && archiveFsRoot) {
    // setup files view
    await archiveFsRoot.readData({maxPreviewLength: 1e5})
    await filesBrowser.setCurrentSource(archiveFsRoot, {suppressEvent: true})
    await loadReadme()
  }

  render()
}

async function onClickChangeHeaderTitle (e) {
  e.preventDefault()
  e.stopPropagation()

  // start the inline edit flow
  headerEditValues.title = archive.info.title
  render()
  document.querySelector('input.title').select()
}

function onDismissGettingStarted (e) {
  e.preventDefault()
  e.stopPropagation()

  // start hide animation
  document.querySelector('.setup-info').classList.add('hide-animation')

  setTimeout(() => {
    localStorage[archive.info.key + '-gsd'] = '1'
    isGettingStartedDismissed = true
    render()
  }, 450)
}

function onClickFavicon (e) {
  e.preventDefault()
  e.stopPropagation()

  if (!archive.info.isOwner) {
    return
  }

  let rect = e.currentTarget.getClientRects()[0]

  faviconPicker.create({
    x: rect.left,
    y: rect.bottom,
    async onSelect (imageData) {
      // write file to the dat then restore to the workspace
      let archive2 = await DatArchive.load('dat://' + archive.info.key) // instantiate a new archive with no version
      await archive2.writeFile('/favicon.ico', imageData)
      if (workspaceInfo && workspaceInfo.name) {
        await beaker.workspaces.revert(0, workspaceInfo.name, {paths: ['/favicon.ico']})
      }
      faviconCacheBuster = Date.now()
      isFaviconSet = true
      render()
    }
  })
}

async function onAddToDatIgnore (e, node) {
  e.preventDefault()
  e.stopPropagation()

  let matchPattern = node.path.slice(1) // trim leading slash
  await beaker.workspaces.addToDatignore(0, workspaceInfo.name, matchPattern)
}

function onExpandAllRevisions () {
  workspaceInfo.revisions.forEach(rev => {
    rev.isOpen = true
    rev.isLoadingDiff = true
  })
  render()

  workspaceInfo.revisions.forEach(async rev => {
    await loadDiff(rev)
    render()
  })
}

async function onToggleRevisionCollapsed (rev) {
  rev.isOpen = !rev.isOpen

  // fetch the diff it hasn't been loaded yet
  if (!rev.diff) {
    // render loading state
    rev.isLoadingDiff = true
    render()

    await loadDiff(rev)
  }

  render()
}

async function onPublishRevision (e, rev) {
  e.stopPropagation()
  e.preventDefault()

  if (!rev) return
  if (!confirm(`Publish ${rev.path.slice(1)}?`)) return
  let paths = (rev.type === 'dir') ? [rev.path + '/'] : [rev.path] // add a trailing slash to identify folders
  await beaker.workspaces.publish(0, workspaceInfo.name, {paths})
}

async function onPublishAllRevisions (e) {
  e.stopPropagation()
  e.preventDefault()

  const paths = workspaceInfo.revisions.map(rev => (
    (rev.type === 'dir') ? (rev.path + '/') : rev.path // add a trailing slash to identify folders
  ))

  if (!confirm(`Publish ${paths.length} ${pluralize(paths.length, 'change')}?`)) return
  try {
    await beaker.workspaces.publish(0, workspaceInfo.name, {paths})
    toast.create('Changes published.', 'success')
  } catch (e) {
    console.error(e)
    toast.create('Could not publish changes. Something went wrong.', 'error')
    return
  }
  activeView = 'files'
  window.history.pushState('', {}, `beaker://library/${archive.url}#files`)
  clearRevisions()
  render()
}

async function onRevertRevision (e, rev) {
  e.stopPropagation()
  e.preventDefault()

  if (!rev) return
  if (!confirm(`Revert changes to ${rev.path.slice(1)}?`)) return
  let paths = (rev.type === 'dir') ? [rev.path + '/'] : [rev.path] // add a trailing slash to identify folders
  await beaker.workspaces.revert(0, workspaceInfo.name, {paths})
}

async function onRevertAllRevisions (e) {
  e.stopPropagation()
  e.preventDefault()

  const paths = workspaceInfo.revisions.map(rev => rev.path)

  if (!confirm(`Revert ${paths.length} ${pluralize(paths.length, 'unpublished change')}?`)) return
  await beaker.workspaces.revert(0, workspaceInfo.name, {paths})
  clearRevisions()
}

async function onSetCurrentSource (node) {
  // try to load the readme
  loadReadme()

  // update the URL & history
  let path = archive.url
  if (node._path) {
    path += node._path
  }
  window.history.pushState('', {}, `beaker://library/${path}`)
}

function onDropFiles (files) {
  if (!archive.info.isOwner) {
    return
  }
  const dst = filesBrowser.getCurrentSource().url
  files.forEach(f => {
    const src = f.path
    onAddFile({detail: {src, dst}})
  })
}

function onOpenFolder (path) {
  beaker.browser.openFolder(path)
}

function onDownloadZip () {
  beaker.browser.downloadURL(`${archive.url}?download_as=zip`)
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

async function onChangeWorkspaceDirectory () {
  if (!archive.info.isOwner) return
  let publishTargetUrl = archive.url

  // get an available path for a directory
  let defaultPath
  if (workspaceInfo && workspaceInfo.localFilesPath) {
    defaultPath = workspaceInfo.localFilesPath
  } else {
    let basePath = await beaker.browser.getSetting('workspace_default_path')
    defaultPath = await beaker.browser.getDefaultLocalPath(basePath, archive.info.title)
  }

  // enter a loop
  let localFilesPath
  while (true) {
    // open the create workspace popup
    let res = await workspacePopup.create({
      defaultPath,
      title: archive.info.title
    })
    localFilesPath = res.localFilesPath

    try {
      if (!workspaceInfo) {
        workspaceInfo = await beaker.workspaces.create(0, {localFilesPath, publishTargetUrl})
        filesBrowser.setWorkspaceInfo(workspaceInfo)
      } else {
        await beaker.workspaces.set(0, workspaceInfo.name, {localFilesPath})
      }
    } catch (e) {
      if (e.name === 'DestDirectoryNotEmpty') {
        alert('Folder not empty. Please choose an empty directory.')
        continue // show the popup again
      } else {
        toplevelError = createToplevelError(e)
        render()
        return // failure, stop trying
      }
    }
    break // success, break the loop
  }

  await beaker.workspaces.setupFolder(0, workspaceInfo.name)
  setupWorkspaceListeners()

  window.history.pushState('', {}, `beaker://library/${publishTargetUrl}`)
  await setup()
  onOpenFolder(localFilesPath)
  render()
}

async function onAddFile (e) {
  const {src, dst} = e.detail
  const res = await DatArchive.importFromFilesystem({src, dst, ignore: ['dat.json'], inplaceImport: false})
  if (workspaceInfo && workspaceInfo.name) {
    await beaker.workspaces.revert(0, workspaceInfo.name, {paths: res.addedFiles})
  }
}

async function onRenameFile (e) {
  try {
    const {path, newName} = e.detail
    const to = setTimeout(() => toast.create('Renaming...'), 500) // if it takes a while, toast
    const newPath = path.split('/').slice(0, -1).concat(newName).join('/')
    await archive.rename(path, newPath)
    await beaker.workspaces.revert(0, workspaceInfo.name, {paths: [path, newPath]})
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
      await archive.rmdir(path, {recursive: true})
    } else {
      await archive.unlink(path)
    }
    await beaker.workspaces.revert(0, workspaceInfo.name, {paths: [path]})

    clearTimeout(to)
    toast.create(`Deleted ${path}`)
    render()
  } catch (e) {
    toast.create(e.toString(), 'error', 5e3)
  }
}

async function onKeyupHeaderEdit (e, name) {
  if (e.keyCode == 13) {
    // enter-key
    await setManifestValue(name, headerEditValues[name])
  }

  if (e.keyCode == 13 || e.keyCode == 27) {
    // enter or escape key
    headerEditValues[name] = false
    render()
  } else {
    headerEditValues[name] = e.target.value
  }
}

function onKeyupSettingsEdit (e, name) {
  settingsEditValues[name] = e.target.value
  render()
}

async function onSaveSettingsEdit (e, name) {
  e.preventDefault()
  e.stopPropagation()

  // validate
  let value = e.target.form.querySelector('input').value
  if (name === 'repository' && value && !IS_GIT_URL_REGEX.test(value)) {
    toast.create('Repository must be a valid Git URL.', 'error', 3e3)
    return
  }

  // update
  await setManifestValue(name, value)
  settingsSuccess[name] = true
  settingsEditValues[name] = false
  render()

  setTimeout(() => {
    settingsSuccess[name] = false
    render()
  }, 4000)

  // blur the input
  try { document.querySelector('input:focus').blur() }
  catch (e) { /* no input focused */ }
}

async function onFilesChanged () {
  // update files
  const currentNode = filesBrowser.getCurrentSource()
  try {
    await currentNode.readData()
    filesBrowser.rerender()
  } catch (e) {
    console.debug('Failed to rerender files on change, likely because the present node was deleted', e)
  }

  // update readme
  loadReadme()

  // update revisions
  await loadWorkspaceRevisions()
  if (activeView === 'workspace') {
    render()
  }
}

async function onWorkspaceChanged () {
  await loadWorkspaceRevisions()
  render()
}

function clearRevisions() {
  workspaceInfo.revisions = []
}

function onNetworkChanged (e) {
  if (e.details.url === archive.url) {
    var now = Date.now()
    archive.info.peerInfo = e.details.peers
    archive.info.peers = e.details.peerCount
    var lastHistory = archive.info.peerHistory.slice(-1)[0]
    if (lastHistory && (now - lastHistory.ts) < 10e3) {
      // if the last datapoint was < 10s ago, just update it
      lastHistory.peers = e.details.peerCount
    } else {
      archive.info.peerHistory.push({ts: now, peers: e.details.peerCount})
    }
    render()
  }
}

function onClickAnywhere (e) {
  // abort header title inline edit
  if (headerEditValues.title !== false) {
    if (!findParent(e.target, 'title')) { // not a click in the input
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
  let oldView = activeView
  let hash = window.location.hash
  if (hash.startsWith('#')) hash = hash.slice(1)
  if (hash) {
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
    var pathParts = urlp.pathname.split('/').filter(Boolean)

    // select the archive
    node = archiveFsRoot
    await node.readData({maxPreviewLength: 1e5})

    // now select the folders
    let pathPart
    while ((pathPart = pathParts.shift())) {
      node = node.children.find(node => node.name === pathPart)
      if (node.type !== 'file') {
        // dont read for files, just folders
        // (that way we dont get stalled loading the preview)
        await node.readData()
      }
    }

    await filesBrowser.setCurrentSource(node, {suppressEvent: true})
    loadReadme()
  } catch (e) {
    // ignore, but log just in case something is buggy
    console.debug(e)
  }
}

async function setManifestValue (attr, value) {
  try {
    value = value || ''
    let archive2 = await DatArchive.load('dat://' + archive.info.key) // instantiate a new archive with no version
    await archive2.configure({[attr]: value})
    Object.assign(archive.info, {[attr]: value})
    Object.assign(archive.info.manifest, {[attr]: value})
    document.title = `Library - ${archive.info.title || 'Untitled'}`
  } catch (e) {
    toast.create(e.toString(), 'error', 5e3)
  }
}

// helper to rerender the peer history graph
function updateGraph () {
  if (activeView === 'network') {
    var el = document.querySelector(`#history-${archive.key}`)
    yo.update(el, renderPeerHistoryGraph(archive.info))
  }
}

function getSafeTitle () {
  return _get(archive, 'info.title', '').trim() || 'Untitled'
}

function getSafeDesc () {
  return _get(archive, 'info.description', '').trim() || yo`<em>No description</em>`
}

async function parseLibraryUrl () {
  var url
  if (window.location.pathname.slice(1).startsWith('workspace:')) {
    const wsName = window.location.pathname.slice('/workspace://'.length).split('/')[0]

    const wsInfo = await beaker.workspaces.get(0, wsName)
    if (wsInfo) {
      url = wsInfo.publishTargetUrl
      window.location.pathname = url + window.location.pathname.slice(`/workspace://${wsInfo.name}`.length)
    } else {
      toplevelError = createToplevelError('Invalid workspace name')
      render()
    }
  } else {
    url = window.location.pathname.slice(1)
  }
  return url
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