import * as yo from 'yo-yo'
import _get from 'lodash.get'
import * as toast from './toast'
import * as pages from '../pages'
import * as globals from '../globals'
import {getBasicType, basicTypeToLabel} from '../../lib/dat'
import toggleable2, {closeAllToggleables} from '../../builtin-pages/com/toggleable2'

// exported api
// =

export function render (id, page) {
  const url = page ? page.getURL() : ''
  const isViewingDat = url.startsWith('dat:')
  if (!isViewingDat) {
    return '' // for now, dont render anything unless a dat
  }

  const title = _get(page, 'siteInfo.title')
  const description = _get(page, 'siteInfo.description')
  const isSaved = _get(page, 'siteInfo.userSettings.isSaved', false)
  const isOwner = _get(page, 'siteInfo.isOwner', undefined)
  const isPublished = _get(page, 'siteInfo.isPublished', undefined)
  const isNetworked = true // TODO
  const basicType = getBasicType(_get(page, 'siteInfo.type', []))
  const isUser = basicType === 'user'
  const isCurrentUser = _get(page, 'siteTrust.isUser', false)
  const isFollowed = _get(page, 'siteTrust.isFollowed', false)

  return yo`
    <div class="toolbar-actions" data-id="contextbar-${id}">
      <div class="toolbar-group">
        <span class="toolbar-info-card">
          <img src="beaker://assets/img/templates/${basicType}.png">
          <strong>${title || basicTypeToLabel(basicType)}</strong>
          ${cond(description, () => yo`<span>${description}</span>`)}
          ${cond(isOwner === true, () => yo`
            <button class="toolbar-labeled-btn" onclick=${() => isUser ? onEditProfile(id, page) : onEditDetails(id, page)}>
              <i class="fas fa-pencil-alt"></i>
            </button>`
          )}
        </span>
        ${cond(isOwner === true && isUser === false, () => toggleable2({
          id: (id + '-visibility-toggle'),
          closed ({onToggle}) {
            return yo`
              <div class="toolbar-dropdown-menu toggleable-container">
                <button class="toolbar-labeled-btn raised toolbar-dropdown-menu-btn" onclick=${onToggle}>
                  <span class="${getVisibilityIcon({isPublished, isNetworked})}"></span> ${getVisibilityLabel({isPublished, isNetworked})} <span class="fas fa-caret-down"></span>
                </button>
              </div>`
          },
          open ({onToggle}) {
            return yo`
              <div class="toolbar-dropdown-menu contextbar-dropdown-menu wider toggleable-container">
                <button class="toolbar-labeled-btn raised toolbar-dropdown-menu-btn" onclick=${onToggle}>
                  <span class="${getVisibilityIcon({isPublished, isNetworked})}"></span> ${getVisibilityLabel({isPublished, isNetworked})} <span class="fas fa-caret-down"></span>
                </button>
                <div class="toolbar-dropdown dropdown toolbar-dropdown-menu-dropdown">
                  <div class="dropdown-items center with-triangle">
                    <div class="dropdown-title">Who can see this?</div>
                    <div class="dropdown-item" onclick=${() => onSetVisibility(id, page, 'published')}>
                      <div class="label">
                        <i class="${getVisibilityIcon({isPublished: true, isNetworked: true})}"></i>
                        ${getVisibilityLabel({isPublished: true, isNetworked: true})}
                        ${cond(isPublished && isNetworked, () => yo`<i class="fas fa-check"></i>`)}
                      </div>
                      <p class="description">
                        The site is publicly listed on your personal site.
                      </p>
                    </div>
                    <div class="dropdown-item" onclick=${() => onSetVisibility(id, page, 'unlisted')}>
                      <div class="label">
                        <i class="${getVisibilityIcon({isPublished: false, isNetworked: true})}"></i>
                        ${getVisibilityLabel({isPublished: false, isNetworked: true})}
                        ${cond(!isPublished && isNetworked, () => yo`<i class="fas fa-check"></i>`)}
                      </div>
                      <p class="description">
                        Anybody can visit this site if they know the URL.
                      </p>
                    </div>
                    <div class="dropdown-item disabled">
                      <div class="label">
                        <i class="${getVisibilityIcon({isPublished: false, isNetworked: false})}"></i>
                        ${getVisibilityLabel({isPublished: false, isNetworked: false})}
                        (TODO)
                        ${cond(!isNetworked, () => yo`<i class="fas fa-check"></i>`)}
                      </div>
                      <p class="description">
                        The site is offline and only you can visit it.
                      </p>
                    </div>
                  </div>
                </div>
              </div>`
          }
        }))}
        ${cond(isCurrentUser === false && isUser === true, () => yo`
          <button class="toolbar-labeled-btn raised" onclick=${() => onToggleFollow(id, page)}>
            <span class="fas fa-rss ${isFollowed ? 'red-x' : ''}"></span>
            ${isFollowed ? 'Unfollow' : 'Follow'}
          </button>`
        )}
        ${cond(isUser === true, () => [
          yo` 
            <button class="toolbar-labeled-btn raised" onclick=${() => onOpenPage(id, page, `beaker://search/?source=${page.getURLOrigin()}`)}>
            <i class="fas fa-search"></i> Explore
            </button>`
        ])}
      </div>
      <div class="spacer"></div>
      <div class="toolbar-group">
        ${toggleable2({
          id: (id + '-library-toggle'),
          closed ({onToggle}) {
            return yo`
              <div class="toolbar-dropdown-menu toggleable-container">
                <button class="toolbar-labeled-btn toolbar-dropdown-menu-btn" onclick=${onToggle}>
                  <span class="far fa-hdd"></span> Library <span class="fas fa-caret-down"></span>
                </button>
              </div>`
          },
          open ({onToggle}) {
            return yo`
              <div class="toolbar-dropdown-menu contextbar-dropdown-menu toggleable-container">
                <button class="toolbar-labeled-btn toolbar-dropdown-menu-btn" onclick=${onToggle}>
                  <span class="far fa-hdd"></span> Library <span class="fas fa-caret-down"></span>
                </button>
                <div class="toolbar-dropdown dropdown toolbar-dropdown-menu-dropdown">
                  <div class="dropdown-items compact right with-triangle">
                    ${cond(isCurrentUser === false, () => [
                      isSaved
                        ? yo`
                          <div class="dropdown-item" onclick=${() => onRemoveFromLibrary(id, page)}>
                            <i class="fas fa-minus"></i> Remove from Library
                          </div>`
                        : yo`
                          <div class="dropdown-item" onclick=${() => onAddToLibrary(id, page)}>
                            <i class="fas fa-plus"></i> Add to Library
                          </div>`,
                      yo`<hr>`
                    ])}
                  
                    <div class="dropdown-item" onclick=${() => onFork(id, page)}>
                      <i class="far fa-clone"></i> Duplicate site
                    </div>

                    <div class="dropdown-item" onclick=${() => onDownloadZip(id, page)}>
                      <i class="far fa-file-archive"></i> Download as .zip
                    </div>

                    <hr>
                  
                    <div class="dropdown-item" onclick=${() => onOpenPage(id, page, `beaker://library/${page.getURLOrigin()}#settings`)}>
                      <i class="fas fa-cog"></i> Settings
                    </div>
                  </div>
                </div>
              </div>`
          }
        })}
        ${toggleable2({
          id: (id + '-more-toggle'),
          closed ({onToggle}) {
            return yo`
              <div class="toolbar-dropdown-menu toggleable-container">
                <button class="toolbar-labeled-btn toolbar-dropdown-menu-btn" onclick=${onToggle}>
                  More <span class="fas fa-caret-down"></span>
                </button>
              </div>`
          },
          open ({onToggle}) {
            return yo`
              <div class="toolbar-dropdown-menu contextbar-dropdown-menu toggleable-container">
                <button class="toolbar-labeled-btn toolbar-dropdown-menu-btn" onclick=${onToggle}>
                  More <span class="fas fa-caret-down"></span>
                </button>
                <div class="toolbar-dropdown dropdown toolbar-dropdown-menu-dropdown">
                  <div class="dropdown-items compact right with-triangle">
                    ${cond(isUser, () => [
                      yo`
                        <div class="dropdown-item" onclick=${() => onOpenPage(id, page, `beaker://search/?source=${page.getURLOrigin()}`)}>
                          <i class="fas fa-search"></i> Explore
                        </div>`,
                      yo`<hr>`
                    ])}

                    <div class="dropdown-item" onclick=${() => onOpenPage(id, page, `beaker://editor/${page.getURLOrigin()}`)}>
                      <i class="fas fa-code"></i> View source code
                    </div>

                    <div class="dropdown-item"  onclick=${() => onOpenPage(id, page, `beaker://library/${page.getURLOrigin()}`)}>
                      <i class="fas fa-sitemap"></i> View site files
                    </div>
                  </div>
                </div>
              </div>`
          }
        })}
      </div>
    </div>`
}

// rendering
// =

function cond (b, fn) {
  if (!b) return ''
  return fn()
}

function update (id, page) {
  yo.update(document.querySelector(`[data-id="contextbar-${id}"]`), render(id, page))
}

// event handlers
// =

async function onEditProfile (id, page) {
  try {
    await beaker.browser.showEditProfileModal()
    page.reloadAsync()
  } catch (e) {
    // ignore
  }
}

function onEditDetails (id, page) {
  // TODO
  alert('todo')
}

async function onSetVisibility (id, page, visibility) {
  closeAllToggleables()
  try {
    if (visibility === 'published') {
      if (page.siteInfo.isPublished) return
      var details = {
        url: page.getURLOrigin(),
        title: _get(page, 'siteInfo.title'),
        description: _get(page, 'siteInfo.description')
      }
      details = await beaker.browser.showShellModal('publish-archive', details)
      toast.create(`Published ${details.title || details.url}`, 'success')
      page.siteInfo.title = details.title
      page.siteInfo.description = details.description
      page.siteInfo.isPublished = true
    } else if (visibility === 'unlisted') {
      if (!page.siteInfo.isPublished) return
      await beaker.archives.unpublish(page.getURLOrigin())
      toast.create(`Unpublished ${_get(page, 'siteInfo.title') || page.getURLOrigin()}`)
      page.siteInfo.isPublished = false
    } else if (visibility === 'offline') {
      // TODO
    }
  } catch (err) {
    if (err.message === 'Canceled') return
    console.error(err)
    toast.create(err.toString())
  }
  update(id, page)
}

async function onToggleFollow (id, page) {
  try {
    var currentUserSession = globals.getCurrentUserSession()
    if (_get(page, 'siteTrust.isFollowed', false)) {
      await beaker.followgraph.unfollow(page.getURLOrigin())
    } else {
      await beaker.followgraph.follow(page.getURLOrigin())
    }
    page.reloadAsync()
  } catch (err) {
    console.error(err)
    toast.create(err.toString())
  }
}

async function onOpenPage (id, page, url) {
  closeAllToggleables()
  page.loadURL(url)
}

async function onAddToLibrary (id, page) {
  closeAllToggleables()
  try {
    await beaker.archives.add(page.getURLOrigin(), {isSaved: true})
  } catch (err) {
    console.error(err)
    toast.create(err.toString())
    return
  }
  toast.create(`Added ${_get(page, 'siteInfo.title', '')} to your library.`)
  page.siteInfo.userSettings.isSaved = true
  update(id, page)
}

async function onRemoveFromLibrary (id, page) {
  closeAllToggleables()
  try {
    await beaker.archives.remove(page.getURLOrigin())
  } catch (err) {
    console.error(err)
    toast.create(err.toString())
    return
  }
  toast.create(`Removed ${_get(page, 'siteInfo.title', '')} from your library.`)
  page.siteInfo.userSettings.isSaved = false
  update(id, page)
}

async function onFork (id, page) {
  closeAllToggleables()
  const fork = await DatArchive.fork(page.getURLOrigin(), {prompt: true}).catch(() => {})
  if (fork) {
    page.loadURL(fork.url)
  }
}

async function onDownloadZip (id, page) {
  closeAllToggleables()
  beaker.browser.downloadURL(`${page.getURLOrigin()}?download_as=zip`)
}

function getVisibilityIcon ({isPublished, isNetworked}) {
  if (isPublished) return 'fas fa-globe-americas'
  if (isNetworked) return 'fas fa-eye'
  return 'fas fa-lock'
}

function getVisibilityLabel ({isPublished, isNetworked}) {
  if (isPublished) return 'Published'
  if (isNetworked) return 'Unlisted'
  return 'Only me'
}