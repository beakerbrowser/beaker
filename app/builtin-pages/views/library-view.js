/* globals DatArchive beaker */

import yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'
import {FSArchive} from 'beaker-virtual-fs'
import {Archive as LibraryDatArchive} from 'builtin-pages-lib'
import parseDatURL from 'parse-dat-url'
import _get from 'lodash.get'
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
import {writeToClipboard} from '../../lib/fg/event-handlers'
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

var toplevelError
var copySuccess = false
var isFaviconSet = true
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
  try {
    // load platform info
    let browserInfo = await beaker.browser.getInfo()
    window.OS_CAN_IMPORT_FOLDERS_AND_FILES = browserInfo.platform !== 'linux'

    // load data
    let url = window.location.pathname.slice(1)
    archive = new LibraryDatArchive(url)
    await archive.setup()

    document.title = `Library - ${archive.info.title || 'Untitled'}`

    // construct files browser
    archiveFsRoot = new FSArchive(null, archive, archive.info)
    filesBrowser = new FilesBrowser(archiveFsRoot)
    filesBrowser.onSetCurrentSource = onSetCurrentSource

    // set up download progress
    await archive.startMonitoringDownloadProgress()

    // fetch workspace info for this archive
    workspaceInfo = await beaker.workspaces.get(0, archive.info.url)
    await loadWorkspaceRevisions()

    // check if the favicon is set
    if (_get(archive, 'info.isOwner')) {
      let favicon = await beaker.sitedata.get(archive.url, 'favicon')
      if (!favicon) favicon = await (archive.stat('/favicon.png').catch(() => null))
      if (!favicon) {
        isFaviconSet = false
      }
    }

    // load state and render
    await readViewStateFromUrl()

    // wire up events
    window.addEventListener('popstate', onPopState)
    archive.progress.addEventListener('changed', render)
    document.body.addEventListener('custom-add-file', onAddFile)
    document.body.addEventListener('custom-rename-file', onRenameFile)
    document.body.addEventListener('custom-delete-file', onDeleteFile)
    beaker.archives.addEventListener('network-changed', onNetworkChanged)
    setupWorkspaceListeners()

    let onFilesChangedThrottled = throttle(onFilesChanged, 1e3)
    var fileActStream = archive.createFileActivityStream()
    fileActStream.addEventListener('invalidated', onFilesChangedThrottled)
    fileActStream.addEventListener('changed', onFilesChangedThrottled)
  } catch (e) {
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
    console.error('Error running diff', e)
    if (e.invalidEncoding) {
      revision.diff = {invalidEncoding: true}
    }
    if (e.sourceTooLarge) {
      revision.diff = {sourceTooLarge: true}
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
      readmeElement = yo`
        <div class="file-preview-container readme">
          ${readmeHeader}
          ${readmeContent}
        </div>`
    } else if (!(readmeContent || node.parent)) {
      readmeElement = renderReadmeHint()
    }
  }

  render()
}

// rendering
// =

function render () {
  yo.update(
    document.querySelector('.library-wrapper'), yo`
      <div class="library-wrapper library-view builtin-wrapper">
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

function renderHeader () {
  const isOwner = _get(archive, 'info.isOwner')
  return yo`
    <div class="builtin-header">
      <div class="container">
        <a href="beaker://library" class="back-link">
          <i class="fa fa-angle-double-left"></i>
        </a>

        ${isOwner
          ? yo`
            <div
              class="favicon-container editable tooltip-container ${isFaviconSet ? '' : 'unset'}"
              data-tooltip=${isFaviconSet ? 'Change favicon' : 'Set favicon'}
              onclick=${onClickFavicon}
            >
              ${isFaviconSet
                ? yo`<img src="beaker-favicon:${archive.url}?cache=${faviconCacheBuster}" />`
                : yo`<i class="fa fa-plus"></i>`}
            </div>`
          : yo`
            <div class="favicon-container">
              <img src="beaker-favicon:${archive.url}?cache=${faviconCacheBuster}" />
            </div>`
        }

        ${isOwner
          ? yo`
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

        <button class="btn plain tooltip-container" data-tooltip="${copySuccess ? 'Copied' : 'Copy URL'}" onclick=${() => onCopy(archive.url)}>
          <i class="fa fa-link"></i>
        </button>

        ${renderTabs()}
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
    case 'revisions':
      return renderRevisionsView()
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
      secondaryAction = yo`
        <span class="path" onclick=${() => onOpenFolder(workspaceInfo.localFilesPath)}>
          ${workspaceInfo.localFilesPath}
        </span>`
    } else if (workspaceInfo && workspaceInfo.localFilesPathIsMissing) {
      secondaryAction = yo`
        <span class="path error">
          <em>
            Directory not found (${workspaceInfo.missingLocalFilesPath})
          </em>

          <button class="btn" onclick=${onChangeWorkspaceDirectory}>
            Choose new directory
          </button>
        </span>`
    } else if (!_get(archive, 'info.userSettings.isSaved')) {
      secondaryAction = yo`
        <button class="btn" onclick=${onSave}>
          Save to your Library
        </button>`
    } else if (_get(archive, 'info.isOwner') && (!workspaceInfo || !workspaceInfo.localFilesPath)) {
      secondaryAction = ''
    } else {
      secondaryAction = yo`<em>Read-only</em>`
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

        <div class="workspace-info">${secondaryAction}</div>

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
        ${archive.info.isOwner ? renderSetupChecklist() : ''}
        ${filesBrowser ? filesBrowser.render(renderRevisionsOverview()) : ''}
        ${readmeElement || ''}
        ${!archive.info.isOwner ? renderMakeCopyHint() : ''}
      </div>
    </div>
  `
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

        <a class="learn-more-link" href="https://en.wikipedia.org/wiki/README" target="_blank">What's a README?</a>
      </div>
    </div>`
}

function renderRevisionsOverview () {
  if (!workspaceInfo || !workspaceInfo.revisions.length) return ''

  return yo`
    <div class="revisions-overview">
      ${workspaceInfo.revisions.slice(0, 4).map(renderRevisionType)}
      <span class="label" onclick=${e => onChangeView(e, 'revisions')}>
        ${workspaceInfo.revisions.length} ${pluralize(workspaceInfo.revisions.length, 'unpublished revision')}
      </span>

      <div class="buttons">
        <button class="btn plain" onclick=${e => onChangeView(e, 'revisions')}>
          <i class="fa fa-code"></i>
          <span>Review changes</span>
        </button>

        <a href="workspace://${workspaceInfo.name}" class="btn plain" target="_blank">
          <i class="fa fa-external-link"></i>
          <span>Live preview</span>
        </a>
      </div>
    </div>
  `
}

function renderSetupChecklist () {
  const hasTitle = _get(archive, 'info.title').trim()
  const hasWorkspaceDirectory = workspaceInfo && workspaceInfo.localFilesPath
  const hasFavicon = false // TODO

  if (hasTitle && hasWorkspaceDirectory && hasFavicon) return ''

  return yo`
    <div class="setup-info">
      <h2 class="lined-heading">
        <i class="fa fa-magic"></i>
        Getting started
      </h2>

      <div class="setup-checklist">
        <div class="checklist-item">
          <h3 class="label">
            <i class="fa fa-code"></i>
            Set workspace directory
            ${hasWorkspaceDirectory ? yo`<i class="fa fa-check-circle"></i>` : ''}
          </h3>

          <p class="description">
            Choose where to save this project's files.
          </p>

          <button class="btn" onclick=${onChangeWorkspaceDirectory}>
            Set directory
          </button>
        </div>

        <div class="checklist-item">
          <h3 class="label">
            <i class="fa fa-font"></i>
            Set a title
            ${hasTitle ? yo`<i class="fa fa-check-circle"></i>` : ''}
          </h3>

          <p class="description">
            Add a title to this project to help others find
          </p>

          <div class="actions">
            <button class="btn">
              Set title
            </button>
          </div>
        </div>

        <div class="checklist-item">
          <h3 class="label">
            <i class="fa fa-file-image-o"></i>
            Add favicon
            ${hasFavicon ? yo`<i class="fa fa-check-circle"></i>` : ''}
          </h3>

          <p class="description">
            Choose an image to use as this project's favicon.
          </p>

          <div class="actions">
            <button class="btn" onclick=${onClickFavicon}>
              Pick a favicon
            </button>

            <a class="learn-more-link" href="https://developer.mozilla.org/en-US/docs/Learn/HTML/Introduction_to_HTML/The_head_metadata_in_HTML#Adding_custom_icons_to_your_site" target="_blank">
              What's a favicon?
            </a>
          </div>
        </div>
      </div>
    </div>
  `
}

function renderSettingsView () {
  const title = archive.info.title || ''
  const editedTitle = settingsEditValues['title']
  const isEditingTitle = editedTitle && title !== editedTitle

  const description = archive.info.description || ''
  const editedDescription = settingsEditValues['description']
  const isEditingDescription = editedDescription && description !== editedDescription

  const gitRepository = archive.info.repository
  const editedGitRepository = settingsEditValues['repository']
  const isEditingGitRepository = editedGitRepository && gitRepository !== editedGitRepository

  const isOwner = _get(archive, 'info.isOwner')

  function renderEditable (key, value, placeholder='') {
    const isOwner = _get(archive, 'info.isOwner')
    return isOwner && settingsEditValues[key] !== false
      ? yo`
        <p>
          <input
            id="edit-${key}"
            onkeyup=${e => onKeyupSettingsEdit(e, key)}
            value=${settingsEditValues[key] || ''}
            type="text" />
          <button class="btn success">Save</button>
        </p>`
      : yo`
        <span>
          ${value ? value : (isOwner ? '' : yo`<em>--</em>`)}
          ${isOwner
            ? yo`
              <button class="btn" onclick=${e => onClickSettingsEdit(e, key)}>
                ${value ? '' : yo`<em>${placeholder}</em>`}
                <i class="fa fa-pencil"></i>
              </button>`
            : ''}
        </span>`
  }

  let wsPath = workspaceInfo && workspaceInfo.localFilesPath
  if (wsPath && wsPath.indexOf(' ') !== -1) wsPath = `"${wsPath}"`
  return yo`
    <div class="container">
      <div class="settings view">

        <div class="module">
          <h2 class="module-heading">
            <i class="fa fa-info-circle"></i>
            General
          </h2>

          <div class="module-content bordered">

            <h3>Title</h3>
            ${isOwner
              ? yo`
                <form class="input-group">
                  <input type="text" name="title" value=${editedTitle || title} onkeyup=${e => onKeyupSettingsEdit(e, 'title')} placeholder="Set title">
                  <button disabled="${!isEditingTitle}" class="btn">
                    Save
                  </button>
                </form>`
              : yo`<p>${getSafeTitle()}</p>`
            }

            <h3>Description</h3>
            ${isOwner
              ? yo`
                <form class="input-group">
                  <input type="text" name="description" value=${editedDescription || description} onkeyup=${e => onKeyupSettingsEdit(e, 'description')} placeholder="Set description"/>
                  <button disabled="${!isEditingDescription}" class="btn">
                    Save
                  </button>
                </form>`
              : yo`<p>${getSafeDesc()}</p>`
            }

            <h3>Favicon</h3>

            ${isOwner
              ? yo`
                <p class="input-group">
                  <img class="favicon" src="beaker-favicon:${archive.url}?cache=${faviconCacheBuster}"/>
                  <button class="btn" onclick=${onClickFavicon}>
                    Change favicon
                  </button>
                  <a class="learn-more-link" href="https://developer.mozilla.org/en-US/docs/Learn/HTML/Introduction_to_HTML/The_head_metadata_in_HTML#Adding_custom_icons_to_your_site" target="_blank">
                    What's a favicon?
                  </a>
                </p>`
              : yo`<img class="favicon" src="beaker-favicon:${archive.url}?cache=${faviconCacheBuster}"/>`
            }
          </div>
        </div>

        ${isOwner && workspaceInfo
          ? yo`
            <div class="module">
              <h2 class="module-heading">
                <i class="fa fa-code"></i>
                Workspace settings
              </h2>

              <div class="module-content bordered">
                <div>
                  <h3>Workspace directory</h3>

                  ${workspaceInfo.localFilesPath
                    ? yo`
                      <p>
                        This project's files are saved on your computer at
                        <span class="link" onclick=${() => onOpenFolder(workspaceInfo.localFilesPath)}>
                          ${workspaceInfo.localFilesPath}
                        </span>

                        <button class="btn plain tooltip-container" data-tooltip="Copy path" onclick=${() => onCopy(workspaceInfo.localFilesPath)}>
                          <i class="fa fa-clipboard"></i>
                        </button>
                      </p>`
                    : yo`
                      <p>
                        Choose the directory where the files for this project will be saved.
                      </p>`
                  }

                  <form class="input-group">
                    <input type="text" value=${workspaceInfo.localFilesPath || ''} placeholder="Set workspace directory"/>
                    <button class="btn">
                      ${workspaceInfo.localFilesPath ? 'Change' : 'Set'} workspace directory
                    </button>
                  </form>

                  <h3>Local preview URL</h3>

                  <p>
                    Preview unpublished changes at
                    <a href="workspace://${workspaceInfo.name}">workspace://${workspaceInfo.name}</a>

                    <button class="btn plain tooltip-container" data-tooltip="Copy URL" onclick=${() => onCopy(`workspace://${workspaceInfo.name}`)}>
                      <i class="fa fa-clipboard"></i>
                    </button>
                  </p>


                  <h3>Published URL</h3>

                  <p>
                    Published changes are shared on network at
                    <a href=${archive.url} target="_blank">${shortenHash(archive.url)}</a>

                    <button class="btn plain tooltip-container" data-tooltip="Copy URL" onclick=${() => onCopy(archive.url)}>
                      <i class="fa fa-clipboard"></i>
                    </button>
                  </p>
                </div>
              </div>
            </div>`
          : ''
        }

        <div class="module">
          <h2 class="module-heading">
            <i class="fa fa-git"></i>
            Git integration
          </h2>

          <div class="module-content bordered">
            ${_get(archive, 'info.isOwner')
              ? yo`
                <div>
                  <p>
                    Set a <a href="https://git-scm.com/">Git</a> repository so people can find
                    and contribute to the source code for this project.
                  </p>

                  <form class="input-group">
                    <input type="text" name="repository" value=${editedGitRepository || gitRepository || ''} placeholder="Example: https://github.com/beakerbrowser/beaker.git"/>
                    <button class="btn" disabled=${!isEditingGitRepository}>
                      Save
                    </button>
                  </form>
                </div>`
              : yo`
                ${archive.info.repository
                  ? yo`
                    <p>
                      Find the source code for this project at <a href=${archive.info.repository}>${archive.info.repository}</a>.
                    </p>`
                  : yo`<em class="empty">This project's author has not set a Git repository.</em>`
                }
              `
            }

            <p class="hint">
              <i class="fa fa-question-circle-o"></i>
              New to Git? Check out <a href="https://try.github.io/levels/1/challenges/1">this tutorial</a> to
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

function renderPreviewView () {
  return yo`
    <div class="view preview">
      ${workspaceInfo && workspaceInfo.localFilesPath
        ? yo`<iframe src="workspace://${workspaceInfo.name}"/>`
        : 'Set up your workspace first'
      }
    </div>
  `
}

function renderNetworkView () {
  let progressLabel = ''
  let progressCls = ''
  let seedingIcon = ''
  let seedingLabel = ''

  const {networked, isSaved, expiresAt} = archive.info.userSettings
  const {progress} = archive
  const progressPercentage = `${progress.current}%`
  let downloadedBytes = (archive.info.size / progress.blocks) * progress.downloaded

  if (progress.isComplete) {
    progressLabel = 'All files downloaded'
  } else if (progress.isDownloading) {
    progressLabel = 'Downloading files'
    progressCls = 'active'
  } else {
    progressLabel = 'Download paused'
  }

  if (isSaved && networked) {
    seedingIcon = 'pause'
    seedingLabel = 'Stop seeding these files'
    progressLabel += ', seeding files'
    progressCls += ' green'
  } else {
    seedingIcon = 'arrow-up'
    seedingLabel = 'Seed these files'
  }

  return yo`
    <div class="container">
      <div class="view network">
        <div class="section">
          <div class="module">
            <h2 class="module-heading">Network overview</h2>

            <div class="module-content">
              <h3 class="subtitle-heading">Download status</h3>

              <progress value=${progress.current} max="100">
                ${progress.current}
              </progress>

              <div class="download-status">
                <div class="progress-ui ${progressCls}">
                  <div style="width: ${progressPercentage}" class="completed">
                    ${progressPercentage}
                  </div>
                  <div class="label">${progressLabel}</div>
                </div>

                <button class="btn transparent" data-tooltip=${seedingLabel} onclick=${onToggleSeeding}>
                  <i class="fa fa-${seedingIcon}"></i>
                </button>
              </div>

              <h3 class="subtitle-heading">Network activity (last hour)</h3>
              ${renderPeerHistoryGraph(archive.info)}
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
      </div>
    </div>
  `
}

function renderRevisionsView () {
  if (!workspaceInfo || !workspaceInfo.revisions.length) {
    return yo`
      <div class="container">
        <div class="view">
          <em>No unpublished revisions</em>
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
          <a href="workspace://${workspaceInfo.name}${rev.path}" class="action">View file</a>
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
      <li class="revision" onclick=${() => onToggleRevisionCollapsed(rev)}>
        <div class="revision-header ${rev.isOpen ? '' : 'collapsed'}">
          ${renderRevisionType(rev)}

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
            <span>Live preview</span>
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

function renderRevisionType (rev) {
  return yo`<div class="revision-type ${rev.change}"></div>`
}

function renderTabs () {
  let baseUrl = `beaker://library/${archive.url}`
  return yo`
    <div class="tabs">
      <a href=${baseUrl} onclick=${e => onChangeView(e, 'files')} class="tab ${activeView === 'files' ? 'active' : ''}">
        Files
      </a>

      ${workspaceInfo
        ? yo`
          <a href=${baseUrl + '#revisions'} onclick=${e => onChangeView(e, 'revisions')} class="tab ${activeView === 'revisions' ? 'active' : ''}">
            Revisions
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
        Info
      </a>
    </div>
  `
}

function renderMenu () {
  return toggleable(yo`
    <div class="dropdown toggleable-container">
      <button class="btn primary nofocus toggleable">
        <i class="fa fa-caret-up"></i>
      </button>

      <div class="dropdown-items top right subtle-shadow">
        <div class="dropdown-item" onclick=${onMakeCopy}>
          <i class="fa fa-clone"></i>
          Make a copy
        </div>

        ${workspaceInfo
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

        ${_get(archive, 'info.userSettings.isSaved')
          ? yo`
            <div class="dropdown-item" onclick=${onMoveToTrash}>
              <i class="fa fa-trash-o"></i>
              Move to Trash
            </div>`
          : yo`
            <div class="dropdown-item" onclick=${onSave}>
              <i class="fa fa-download"></i>
              Save to your Library
            </div>`
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
        Open folder
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
  const nickname = archive.info.title || archive.url
  if (confirm(`Move ${nickname} to Trash?`)) {
    try {
      await beaker.archives.remove(archive.url)
      archive.info.userSettings.isSaved = false
    } catch (_) {
      toast.create(`Could not move ${nickname} to Trash`, 'error')
    }
  }
  render()
}

async function onSave () {
  const nickname = archive.info.title || archive.url
  try {
    await beaker.archives.add(archive.url)
    archive.info.userSettings.isSaved = true
    toast.create(`Saved ${nickname} to your Library`, 'success')
  } catch (_) {
    toast.create(`Could not save ${nickname} to your Library`, 'error')
  }
  render()
}

async function onChangeView (e, view) {
  e.preventDefault()
  e.stopPropagation()

  // update state
  activeView = view
  window.history.pushState('', {}, e.currentTarget.getAttribute('href'))

  if (view === 'files' && archiveFsRoot) {
    // setup files view
    await archiveFsRoot.readData({maxPreviewLength: 1e5})
    await filesBrowser.setCurrentSource(archiveFsRoot, {suppressEvent: true})
  }

  render()
}

async function onClickChangeHeaderTitle (e) {
  e.preventDefault()
  e.stopPropagation()

  // take the tooltip off the link while this is active
  let anchorContainer = e.target.parentNode
  let tooltip = anchorContainer.dataset.tooltip
  delete anchorContainer.dataset.tooltip

  // get new value
  let rect = e.currentTarget.getClientRects()[0]
  let res = await contextInput.create({
    x: rect.left - 18,
    y: rect.bottom + 8,
    withTriangle: true,
    label: 'Title',
    value: archive.info.title,
    action: 'Save'
  })
  if (res) {
    await setManifestValue('title', res)
  }

  // restore tooltip
  anchorContainer.dataset.tooltip = tooltip
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
      await archive.writeFile('/favicon.png', imageData)
      if (workspaceInfo && workspaceInfo.name) {
        await beaker.workspaces.revert(0, workspaceInfo.name, {paths: ['/favicon.png']})
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
    activeView = 'files'
    render()
    toast.create('Changes published.', 'success')
  } catch (e) {
    toast.create('Could not publish changes. Something went wrong.', 'error')
  }
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

function onOpenFolder (path) {
  beaker.browser.openFolder(path)
}

function onDownloadZip () {
  beaker.browser.downloadURL(`${archive.url}?download_as=zip`)
}

function onCopy (str) {
  if (archive.info) {
    writeToClipboard(str)
    copySuccess = true
    render()

    window.setTimeout(() => {
      copySuccess = false
      render()
    }, 2000)
  }
}

async function onToggleSeeding () {
  const {isOwner} = archive.info
  const {networked, isSaved} = archive.info.userSettings
  const newNetworkedStatus = !networked

  if (isOwner) {
    try {
      await archive.configure({networked: newNetworkedStatus})
      archive.info.userSettings.networked = newNetworkedStatus
    } catch (e) {
      toast.create('Something went wrong', 'error')
      return
    }
  } else {
    if (isSaved) {
      await beaker.archives.remove(archive.url)
      archive.info.userSettings.isSaved = false
    } else {
      await beaker.archives.add(archive.url)
      archive.info.userSettings.isSaved = true
    }
  }
  render()
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
    clearTimeout(to)
    toast.create(`Deleted ${path}`)
    render()
  } catch (e) {
    toast.create(e.toString(), 'error', 5e3)
  }
}

async function onKeyupSettingsEdit (e, name) {
  if (e.keyCode == 13) {
    // enter-key
    let value = settingsEditValues[name]

    // validate
    if (name === 'repository' && value && !IS_GIT_URL_REGEX.test(value)) {
      toast.create('Repository must be a valid Git URL.', 'error', 3e3)
      e.target.classList.add('error')
      return
    }

    // assign
    await setManifestValue(name, value)
    settingsEditValues[name] = false
    render()
  } else {
    settingsEditValues[name] = e.target.value
    render()
  }
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
  if (activeView === 'revisions') {
    render()
  }
}

async function onWorkspaceChanged () {
  await loadWorkspaceRevisions()
  render()
}

function onNetworkChanged (e) {
  if (e.details.url === archive.url) {
    var now = Date.now()
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
    var urlp = parseDatURL(window.location.pathname.slice(1))
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
  let archive2 = await DatArchive.load('dat://' + archive.info.key) // instantiate a new archive with no version
  await archive2.configure({[attr]: value})
  Object.assign(archive.info, {[attr]: value})
  Object.assign(archive.info.manifest, {[attr]: value})
  document.title = `Library - ${archive.info.title || 'Untitled'}`
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