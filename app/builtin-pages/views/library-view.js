/* globals DatArchive beaker hljs confirm */

import yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'
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
import toggleable2 from '../com/toggleable2'
import renderPeerHistoryGraph from '../com/peer-history-graph'
import * as contextMenu from '../com/context-menu'
import * as toast from '../com/toast'
import * as noticeBanner from '../com/notice-banner'
import * as localSyncPathPopup from '../com/library-localsyncpath-popup'
import * as copyDatPopup from '../com/library-copydat-popup'
import * as createFilePopup from '../com/library-createfile-popup'
import * as faviconPicker from '../com/favicon-picker'
import LibraryViewCompare from '../com/library-view-compare'
import renderSettingsField from '../com/settings-field'
import renderArchiveHistory from '../com//archive-history'
import {setup as setupAce, config as configureAce, getValue as getAceValue, setValue as setAceValue} from '../com/file-editor'
import {pluralize, shortenHash} from '@beaker/core/lib/strings'
import {writeToClipboard, findParent} from '../../lib/fg/event-handlers'
import createMd from '../../lib/fg/markdown'

const DEFAULT_PEERS_LIMIT = 10
const MIN_SHOW_NAV_ARCHIVE_TITLE = [52/*no description*/, 101/*with description*/] // px

// globals
// =

var activeView // will default to 'files'
var activeVersionTab = 'versions'
var archive
var archiveFsRoot
var filesBrowser
var archiveVersion = false

// used in the compare view
var libraryViewCompare

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
var arePeersCollapsed = true
var faviconCacheBuster

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
    window.OS_CAN_IMPORT_FOLDERS_AND_FILES = browserInfo.platform === 'darwin'

    // load data
    let url = await parseLibraryUrl()
    archive = new LibraryDatArchive(url)
    await archive.setup()

    // version
    let vi = archive.url.indexOf('+')
    archiveVersion = (vi !== -1) ? archive.url.slice(vi + 1) : false

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
    beaker.archives.addEventListener('network-changed', onNetworkChanged)
    beaker.archives.addEventListener('folder-sync-error', onFolderSyncError)

    let onFilesChangedThrottled = throttle(onFilesChanged, 1e3)
    var fileActStream = archive.watch()
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
        <div class="file-view-header">
          <span class="path">${readmeMdNode.name}</span>
        </div>`
    } else {
      // try to find the readme file
      const readmeNode = node.children.find(n => (n._name || '').toLowerCase() === 'readme')
      if (readmeNode) {
        // render the element
        const readme = await archive.readFile(readmeNode._path, 'utf8')
        readmeContent = yo`<div class="readme plaintext">${readme}</div>`
        readmeHeader = yo`
          <div class="file-view-header">
            <span class="path">${readmeNode.name}</span>
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
                        This project${"'"}s local directory
                        ${archive.info.missingLocalSyncPath ? `(${archive.info.missingLocalSyncPath})` : ''}
                        was moved or deleted.
                      </span>

                      <button class="btn" onclick=${onChangeSyncDirectory}>Choose new directory</button>
                    </div>
                  </div>`
                : ''
              }

              ${archive.info.isOwner && !archive.info.userSettings.isSaved && activeView === 'files'
                ? yo`
                  <div class="container">
                    <div class="message error">
                      <span>
                        "${archive.info.title ? archive.info.title : 'This archive'}"
                        is in the Trash.
                      </span>
                      <button class="btn" onclick=${onSave}>Restore from Trash</button>
                    </div>
                  </div>`
                : ''
              }

              ${isReadOnly || activeView !== 'files' ? '' : renderVersionPicker()}
              ${renderView()}
            </div>
          </div>
        </div>
      `
    )
  }
}

function renderHeader () {
  const syncPath = _get(archive, 'info.userSettings.localSyncPath')
  const isOwner = _get(archive, 'info.isOwner')
  const hasDescription = !!archive.info.description
  const isExpanded = !isNavCollapsed()
  const isEditingTitle = headerEditValues.title !== false

  return yo`
    <div class="library-view-header ${isExpanded ? 'expanded' : ''} ${hasDescription ? 'has-description' : ''}">
      ${isExpanded
        ? yo`
          <div class="container">
            <div class="info">
              <div class="title ${isOwner ? 'editable' : ''} ${isEditingTitle ? 'editing' : ''}">
                ${isEditingTitle
                  ? yo`<h1>
                    <input
                      class="header-title-input"
                      value=${headerEditValues.title || ''}
                      onblur=${e => onBlurHeaderEditor(e, 'title')}
                      onkeyup=${e => onChangeHeaderEditor(e, 'title')} />
                    </h1>`
                  : yo`<h1 onclick=${onClickHeaderTitle}>${getSafeTitle()}</h1>`}
                ${isOwner ? yo`<span class="fa fa-pencil"></span>` : ''}

                ${!isOwner ? yo`<span class="badge">READ-ONLY</span>` : ''}
              </div>

              ${hasDescription
                ? yo`<p class="description">${archive.info.description}</p>`
                : ''
              }

              ${isOwner
                ? syncPath
                  ?
                    yo`
                      <button onclick=${() => onOpenFolder(syncPath)} oncontextmenu=${onSyncPathContextMenu} class="primary-action btn plain">
                        ${syncPath}
                      </button>
                    `
                  :
                    _get(archive, 'info.localSyncPathIsMissing')
                      ? ''
                      : yo`
                        <button class="primary-action btn primary" onclick=${onChangeSyncDirectory}>
                          Set local directory
                        </button>
                      `
                : yo`
                  <button class="primary-action btn primary" onclick=${onMakeCopy}>
                    Make an editable copy
                  </button>
                `
              }
            </div>
          </div>`
        : ''
      }

      ${renderToolbar()}
    </div>`
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
    case 'settings':
      return renderSettingsView()
    case 'network':
      return renderNetworkView()
    default:
      return yo`<div class="container"><div class="view">Loading...</div></div>`
  }
}

function updateVersionPicker () {
  yo.update(document.querySelector('.version-picker'), renderVersionPicker())
}

function renderVersionPicker () {
  const changeTab = (tab) => {
    activeVersionTab = tab
    updateVersionPicker()
  }

  const rTabs = () => yo`
   <div class="section tabs">
      <button
        class="nofocus tab ${activeVersionTab === 'versions' ? 'active' : ''}"
        onclick=${() => changeTab('versions')}
      >
        History
      </button>
    </div>
  `

  return yo`
    <div class="version-picker container">
      ${toggleable2({
        id: 'version-picker',
        closed: ({onToggle}) => yo`
          <div class="dropdown toggleable-container">
            <button class="btn nofocus" onclick=${onToggle}>
              ${getSafeTitle()}
              <span class="fa fa-caret-down"></span>
            </button>
          </div>`,
        open: ({onToggle}) => yo`
          <div class="dropdown toggleable-container">
            <button class="btn nofocus" onclick=${onToggle}>
              ${getSafeTitle()}
              <span class="fa fa-caret-down"></span>
            </button>

            <div class="dropdown-items left">
              ${rTabs()}
              ${renderArchiveHistory(filesBrowser.root._archive)}
            </div>
          </div>`
      })}
    </div>`
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
        ${filesBrowser ? filesBrowser.render() : ''}
        ${readmeElement ? readmeElement : renderReadmeHint()}
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

function renderSettingsView () {
  const isOwner = _get(archive, 'info.isOwner')

  const title = archive.info.title || ''
  const description = archive.info.description || ''
  const paymentLink = archive.info.links.payment ? archive.info.links.payment[0].href : ''
  const baseUrl = `beaker://library/${archive.url}`

  let syncPath = _get(archive, 'info.userSettings.localSyncPath')
  let syncDirectoryDescription = ''
  if (syncPath) {
    syncDirectoryDescription = yo`
      <div>
        <form>
          <div class="input-group radiolist sync-path">
            <input type="radio" checked=${syncPath} name="has-sync-path" id="syncPath" onchange=${onChangeHasSyncDirectory}/>
            <label for="syncPath">Sync this project's files to</label>

            <input readonly disabled=${!syncPath} type="text" value=${syncPath} placeholder="Choose directory"/>

            <button type="button" class="btn mobile" onclick=${onChangeSyncDirectory}>
              Choose
            </button>

            <button type="button" class="btn desktop" onclick=${onChangeSyncDirectory}>
              Choose directory
            </button>

            <button class="btn copy-path plain tooltip-container" data-tooltip="${copySuccess ? 'Copied' : 'Copy path'}" onclick=${() => onCopy(syncPath, '', true)}>
              <i class="fa fa-clipboard"></i>
            </button>
          </div>

          <div class="input-group radiolist">
            <input type="radio" checked=${!syncPath} id="noSync" name="has-sync-path" onchange=${onChangeHasSyncDirectory}/>
            <label for="noSync">Don't sync to the local filesystem</label>
          </div>
        </form>
      </div>`
  } else if (_get(archive, 'info.localSyncPathIsMissing')) {
    syncDirectoryDescription = yo`
      <div>
        <p>
          <em>
            <i class="fa fa-exclamation-circle"></i> This project${"'"}s local directory was deleted or moved. (${archive.info.missingLocalSyncPath})
          </em>

          <form>
            <button type="button" class="btn" onclick=${onChangeSyncDirectory}>
              Choose new directory
            </button>
            <button type="button" class="btn" onclick=${onRemoveSyncDirectory}>
              Stop syncing
            </button>
          </form>
        </p>
      </div>`
  } else {
    syncDirectoryDescription = yo`
      <div>
        <p>
          Choose where to sync this project${"'"}s files.

          <form>
            <button type="button" class="btn" onclick=${onChangeSyncDirectory}>
              Set local directory
            </button>
          </form>
        </p>
      </div>`
  }

  return yo`
    <div class="container">
      <div class="settings view">
        <h1>${isOwner ? 'Settings for ' : 'About '} "${getSafeTitle()}"</h1>

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
          </div>
        </div>

        ${isOwner
          ? yo`
            <div class="section">
              <h2 class="section-heading">
                Local directory
              </h2>

              <div class="section-content">
                ${syncDirectoryDescription}
              </div>
            </div>`
          : ''
        }

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
                    a <span class="fa fa-usd"></span> icon in your page's URL bar.

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

function renderNetworkView () {
  let progressLabel = ''
  let progressCls = ''
  let seedingIcon = ''
  let seedingLabel = ''
  let clearCacheBtn = ''
  let peersLimit = arePeersCollapsed ? DEFAULT_PEERS_LIMIT : Infinity

  const baseUrl = `beaker://library/${archive.url}`
  const {isSaved} = archive.info.userSettings
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
      progressCls = 'green active'
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

        <h1>Network activity</h1>

        <div class="section">
          <h2 class="section-heading">Overview</h2>

          <div class="section">
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

            ${Number(_get(archive, 'info.peers')) > DEFAULT_PEERS_LIMIT
              ? yo`
                <span class="link" onclick=${onTogglePeersCollapsed}>
                  ${arePeersCollapsed ? 'Show all' : 'Show fewer'} peers
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

          <div class="section-footer">
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

function renderToolbar () {
  return yo`
    <div class="library-toolbar">
      <div class="container">
        ${renderNav()}

        <div class="buttons">
          <a href=${archive.url} class="link" target="_blank">
            ${shortenHash(archive.url)}
          </a>

          ${toggleable2({
            id: 'nav-item-share-tool',
            closed: ({onToggle}) => yo`
              <div class="dropdown share toggleable-container">
                <button class="btn plain nofocus toggleable" onclick=${onToggle}>
                  <span class="fa fa-share-square-o"></span>
                </button>
              </div>`,
            open: ({onToggle}) => yo`
              <div class="dropdown share toggleable-container">
                <button class="btn plain nofocus toggleable" onclick=${onToggle}>
                  <span class="fa fa-share-square-o"></span>
                </button>

                <div class="dropdown-items subtle-shadow">
                  <div class="dropdown-item no-border">
                    <div class="label">
                      Share
                    </div>

                    <p class="description small">
                      Anyone with this link can view this project${"'"}s files
                    </p>

                    <p class="description copy-url">
                      <input type="text" disabled value="${archive.url}"/>

                      <button class="btn" onclick=${() => onCopy(archive.url, 'URL copied to clipboard')}>
                        Copy
                      </button>

                      <a href=${archive.url} target="_blank" class="btn primary full-width center">
                        Open
                        <span class="fa fa-external-link"></span>
                      </a>
                    </p>
                  </div>
                </div>
              </div>`
          })}
        </div>
      </div>
    </div>
  `
}

function renderNav () {
  const isOwner = _get(archive, 'info.isOwner')
  const baseUrl = `beaker://library/${archive.url}`

  return yo`
    <div class="nav-items">
      ${renderMenu()}

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

function renderMenu (opts) {
  const isOwner = _get(archive, 'info.isOwner')
  const isSaved = _get(archive, 'info.userSettings.isSaved')
  const syncPath = _get(archive, 'info.userSettings.localSyncPath')
  const title = getSafeTitle()
  const description = _get(archive, 'info.description').trim()

  return toggleable2({
    id: 'nav-item-main-menu',
    closed: ({onToggle}) => {
      var collapsed = isNavCollapsed()
      return yo`
        <div class="dropdown menu toggleable-container ${collapsed ? 'collapsed' : ''}">
          <button class="btn transparent nofocus toggleable" onclick=${onToggle}>
            <img class="favicon" src="beaker-favicon:${archive.url}?cache=${faviconCacheBuster}" />
            <div class="nav-archive-title ${collapsed ? 'visible' : ''}">${title}</div>
            <span class="fa fa-angle-down"></span>
          </button>
        </div>`
    },
    open: ({onToggle}) => {
      var collapsed = isNavCollapsed()
      return yo`
        <div class="dropdown menu toggleable-container ${collapsed ? 'collapsed' : ''}">
          <button class="btn transparent nofocus toggleable" onclick=${onToggle}>
            <img class="favicon" src="beaker-favicon:${archive.url}?cache=${faviconCacheBuster}" />
            <div class="nav-archive-title ${collapsed ? 'visible' : ''}">${title}</div>
            <span class="fa fa-angle-down"></span>
          </button>

          <div class="dropdown-items left">
            <div class="section">
              <h1 class="title">${title}</h1>
              ${description ? yo`<p class="description">${description}</p>` : ''}
            </div>

            <div class="section menu-items">
              ${isOwner
                ? ''
                : (isSaved
                  ? yo`
                    <div class="dropdown-item" onclick=${onMoveToTrash}>
                      <i class="fa fa-pause"></i>
                      Stop seeding
                    </div>`
                  : yo`
                    <div class="dropdown-item" onclick=${onSave}>
                      <i class="fa fa-arrow-up"></i>
                      Seed these files
                    </div>`
                )
              }

              <div class="dropdown-item" onclick=${onMakeCopy}>
                <i class="fa fa-clone"></i>
                Make ${isOwner ? 'a' : 'an editable'} copy
              </div>

              <div class="dropdown-item" onclick=${e => {onChangeView(e, 'compare'); onToggle(e)}}>
                <div class="revision-indicator-icon">
                  <div class="revision-indicator add"></div><div class="revision-indicator del"></div>
                </div>
                Compare archives
              </div>

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
                )
                : ''
              }
            </div>

            <div class="section">
              <div class="buttons">
                <button class="btn" onclick=${() => window.open(archive.url)}>
                  Open
                </button>

                <button class="btn" onclick=${() => onCopy(archive.url, 'URL copied to clipboard')}>
                  Copy URL
                </button>
              </div>
            </div>
          </div>
        </div>`
    }
  })
}

// events
// =

function onChangeHasSyncDirectory () {
  // TODO
}

function onTogglePeersCollapsed () {
  arePeersCollapsed = !arePeersCollapsed
  render()
}

async function onMakeCopy () {
  let {title} = await copyDatPopup.create({archive})
  const fork = await DatArchive.fork(archive.url, {title, prompt: false}).catch(() => {})
  window.location = `beaker://library/${fork.url}#setup`
}

async function addReadme () {
  const readme = `# ${archive.info.title || 'Untitled'}\n\n${archive.info.description || ''}`
  await archive.writeFile('/README.md', readme)
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

function onProgressUpdate () {
  // rerender if we're on the network page (where we show progress stats)
  if (activeView === 'network') {
    render()
  }
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
    setupAce({readOnly: true})
  }

  render()
}

function renderFaviconPicker () {
  if (!archive.info.isOwner) {
    return ''
  }

  return faviconPicker.create({
    async onSelect (imageData) {
      let archive2 = await DatArchive.load('dat://' + archive.info.key) // instantiate a new archive with no version
      await archive2.writeFile('/favicon.ico', imageData)
      faviconCacheBuster = Date.now()
      isFaviconSet = true
    }
  })
}

async function onSetCurrentSource (node) {
  // try to load the readme
  loadReadme()

  // initialize ace editor (if needed)
  filesBrowser.isEditMode = false
  setupAce({readOnly: true})

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

async function onChangeSyncDirectory () {
  if (!archive.info.isOwner) return

  // get an available path for a directory
  let defaultPath = _get(archive, 'info.userSettings.localSyncPath')
  if (!defaultPath) {
    let basePath = await beaker.browser.getSetting('workspace_default_path')
    defaultPath = await beaker.browser.getDefaultLocalPath(basePath, archive.info.title)
  }

  // open the create folder-picker popup
  let res = await localSyncPathPopup.create({
    defaultPath,
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

  window.history.pushState('', {}, `beaker://library/${archive.url}`)
  await setup()
  onOpenFolder(localSyncPath)
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
  if (!currentNode.isContainer) return // must be a folder
  var basePath = currentNode._path

  // get the name of the new file
  var filePath = await createFilePopup.create({archive, basePath, createFolder})
  if (filePath) {
    if (createFolder) {
      // create new folder
      await archive.mkdir(filePath)
    } else {
      // create new file (empty)
      await archive.writeFile(filePath, '', 'utf8')
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
  setAceValue(currentNode.preview)
  configureAce({readOnly: true})
}

async function onSaveFileEditorContent (e) {
  try {
    var fileContent = getAceValue()
    var currentNode = filesBrowser.getCurrentSource()
    currentNode.preview = fileContent

    // write to the target filename
    var fileName = e.detail.fileName || currentNode.name
    var filePath = joinPaths(currentNode.parent ? currentNode.parent._path : '', fileName)
    if (!filePath.startsWith('/')) {
      filePath = '/' + filePath
    }
    await archive.writeFile(filePath, fileContent, 'utf8')

    if (filePath !== currentNode._path) {
      // go to the new path
      window.history.pushState('', {}, `beaker://library/${archive.url + filePath}`)
      readViewStateFromUrl()

      // delete the old file
      await archive.unlink(currentNode._path)
    }
    toast.create('Saved')
  } catch (e) {
    toast.create(e.toString(), 'error', 5e3)
  }
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
  }
  if (e.key === 'Escape') {
    headerEditValues[name] = false
    render()
  }
}

function onBlurHeaderEditor (e, name) {
  // headerEditValues[name] = false
  // render()
}

function onSyncPathContextMenu (e) {
  e.preventDefault()
  e.stopPropagation()

  const syncPath = _get(archive, 'info.userSettings.localSyncPath')
  contextMenu.create({
    x: e.clientX,
    y: e.clientY,
    right: true,
    items: [
      {icon: 'folder-o', label: 'Open folder', click: () => onOpenFolder(syncPath)},
      {icon: 'clipboard', label: 'Copy path', click: () => {
        writeToClipboard(syncPath)
        toast.create('Path copied to clipboard')
      }},
      {icon: 'pencil', label: 'Change local folder', click: onChangeSyncDirectory},
      {icon: 'times-circle', label: 'Stop syncing to folder', click: onRemoveSyncDirectory}
    ]
  })
}

async function onFilesChanged () {
  // update files
  const currentNode = filesBrowser.getCurrentSource()
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

function onNetworkChanged (e) {
  if (e.details.url === archive.url) {
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
    window.location.hash = '' // remove #setup in case the user reloads
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
    value = value || ''
    let archive2 = await DatArchive.load('dat://' + archive.info.key) // instantiate a new archive with no version
    if (attr === 'paymentLink') {
      archive.info.links.payment = [{href: value, type: 'text/html'}]
      await archive2.configure({links: archive.info.links})
    } else {
      await archive2.configure({[attr]: value})
      Object.assign(archive.info, {[attr]: value})
      Object.assign(archive.info.manifest, {[attr]: value})
    }
    document.title = `Library - ${archive.info.title || 'Untitled'}`
    render()
  } catch (e) {
    toast.create(e.toString(), 'error', 5e3)
  }
}

function isNavCollapsed () {
  if (activeView !== 'files') {
    // not in the files tab
    return true
  }
  if (filesBrowser.getCurrentSource().parent) {
    // looking at a file
    return true
  }
  var main = document.body.querySelector('.builtin-main')
  var hasDescription = (!!archive.info.description) ? 1 : 0
  if (main && main.scrollTop >= MIN_SHOW_NAV_ARCHIVE_TITLE[hasDescription]) {
    // certain distance scrolled
    return true
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
