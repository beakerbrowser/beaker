import yo from 'yo-yo'
import { writeToClipboard, emit } from '../../../lib/fg/event-handlers'
import _get from 'lodash.get'
import * as toast from '../toast'

const FALLBACK_PAGE_HELP = yo`<span>
  The fallback page is displayed any time a visitor goes to a file that doesn't exist.
  A good example might be <code>/404.html</code>.
</span>`

const WEB_ROOT_HELP = yo`<span>
  The web root lets you set a subdirectory as the location which files will be served from.
  This is useful if you use a site-generator which outputs to <code>/_site</code> or some other folder.
</span>`

const CONTENT_SECURITY_POLICY_HELP = yo`<span>
  Content-Security-Policy is a way to control where code and files can be served from.
  <a class="link" href="https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP" target="_blank">You can read about how to use it here.</a>
</span>`

const PREVIEW_MODE_HELP = yo`<span>
  Preview mode lets you see changes to your site before publishing them. You can review the changes in the editor before publishing them.
</span>`

const DONATE_LINK_HELP = yo`<span>
  Enter a link to your donation page and Beaker will show a <span class="fa fa-donate"></span> icon in your site's URL bar.
</span>`

// globals
// =

var expandedSection = sessionStorage.expandedSection || 'info'
var canSave = false
var changedValues = {}

// exported api
// =

export function render (workingCheckout, isReadonly, archiveInfo, workingDatJson) {
  var isApp = (workingDatJson.type || []).includes('application')
  return yo`
    <form class="settings-form" onsubmit=${isReadonly ? undefined : e => onSubmitSettings(e, workingCheckout, workingDatJson)}>
      <div class="settings-form-inner">
        ${section('workingDatJson', 'Site Information', yo`
          <div class="controls">
            ${inputControl(workingDatJson, {isReadonly, label: 'Title', name: 'title'})}
            ${textareaControl(workingDatJson, {isReadonly, label: 'Description', name: 'description'})}
            ${thumbControl(archiveInfo.url, {isReadonly})}
          </div>
        `)}
        ${!isReadonly ? section('dev', 'Development Settings', yo`
          <div class="controls">
            ${previewModeControl(archiveInfo)}
            ${syncPathControl(archiveInfo)}
          </div>
        `) : ''}
        ${isApp ? section('app-perms', 'App Permissions', yo`
          <div class="controls perms-grid">
            ${permissionControl(workingDatJson, {
              isReadonly,
              label: 'Follows API',
              documentation: 'dat://unwalled.garden/docs/api/follows',
              perm: 'unwalled.garden/perm/follows',
              caps: [
                {id: 'read', description: 'Read the user\'s followers'},
                {id: 'write', description: 'Follow and unfollow users'}
              ]
            })}
            ${permissionControl(workingDatJson, {
              isReadonly,
              label: 'Posts API',
              documentation: 'dat://unwalled.garden/docs/api/posts',
              perm: 'unwalled.garden/perm/posts',
              caps: [
                {id: 'read', description: 'Read the user\'s feed'},
                {id: 'write', description: 'Post to the user\'s feed'}
              ]
            })}
            ${permissionControl(workingDatJson, {
              isReadonly,
              label: 'Bookmarks API',
              documentation: 'dat://unwalled.garden/docs/api/bookmarks',
              perm: 'unwalled.garden/perm/bookmarks',
              caps: [
                {id: 'read', description: 'Read the user\'s bookmarks'},
                {id: 'write', description: 'Create and edit the user\'s bookmarks'}
              ]
            })}
            ${permissionControl(workingDatJson, {
              isReadonly,
              label: 'Comments API',
              documentation: 'dat://unwalled.garden/docs/api/comments',
              perm: 'unwalled.garden/perm/comments',
              caps: [
                {id: 'read', description: 'Read the user\'s comments'},
                {id: 'write', description: 'Create and edit the user\'s comments'}
              ]
            })}
            ${permissionControl(workingDatJson, {
              isReadonly,
              label: 'Reactions API',
              documentation: 'dat://unwalled.garden/docs/api/reactions',
              perm: 'unwalled.garden/perm/reactions',
              caps: [
                {id: 'read', description: 'Read the user\'s reactions'},
                {id: 'write', description: 'Create and edit the user\'s reactions'}
              ]
            })}
            ${permissionControl(workingDatJson, {
              isReadonly,
              label: 'Votes API',
              documentation: 'dat://unwalled.garden/docs/api/votes',
              perm: 'unwalled.garden/perm/votes',
              caps: [
                {id: 'read', description: 'Read the user\'s votes'},
                {id: 'write', description: 'Create and edit the user\'s votes'}
              ]
            })}
          </div>
        `) : ''}
        ${section('metadata', 'Site Metadata', yo`
          <div class="controls">    
            ${linkControl(workingDatJson, {isReadonly, label: 'Donation Link', name: 'payment', placeholder: 'e.g. http://opencollective.com/beaker', help: DONATE_LINK_HELP})}
          </div>
        `)}
        ${section('visiting-behaviors', 'Visiting Behaviors', yo`
          <div class="controls">    
            ${inputControl(workingDatJson, {isReadonly, label: 'Fallback Page', name: 'fallback_page', help: FALLBACK_PAGE_HELP})}
            ${inputControl(workingDatJson, {isReadonly, label: 'Web Root', name: 'web_root', help: WEB_ROOT_HELP})}
          </div>
        `)}
        ${section('security', 'Security', yo`
          <div class="controls">
            ${textareaControl(workingDatJson, {isReadonly, label: 'Content Security Policy', name: 'content_security_policy', help: CONTENT_SECURITY_POLICY_HELP})}
          </div>
        `)}
      </div>
      ${isReadonly ? '' : yo`
        <div id="save-settings-form">
          <button class="btn success nofocus disabled">Save changes</button>
        </div>
      `}
    </form>
  `
}

// rendering
// =

function section (id, title, controls) {
  var isExpanded = expandedSection === id
  return yo`
    <section id="${id}" class="${isExpanded ? '' : 'collapsed'}">
      <div class="heading" onclick=${e => onToggleExpanded(id)}>
        <div class="expander">
          <span class="fa fa-fw fa-caret-down"></span>
          <span class="fa fa-fw fa-caret-right"></span>
        </div>
        <div class="title">${title}</div>
      </div>
      ${controls}
    </section>
  `
}

function inputControl (manifest, opts) {
  function onInput (e) {
    changedValues.manifest = changedValues.manifest || {}
    changedValues.manifest[opts.name] = e.currentTarget.value
    setChangesMade()
  }

  return yo`
    <div class="control">
      <label>${opts.label}</label>
      <input
        ${opts.isReadonly ? 'disabled' : ''}
        type="text"
        name="${opts.name}"
        placeholder="${opts.placeholder || ''}"
        value=${manifest[opts.name] || ''}
        oninput=${onInput}
      >
      ${opts.help ? yo`<div class="help"><span class="fa fa-fw fa-info"></span> ${opts.help}</div>` : ''}
    </div>
  `
}

function textareaControl (manifest, opts) {
  function onInput (e) {
    changedValues.manifest = changedValues.manifest || {}
    changedValues.manifest[opts.name] = e.currentTarget.value
    setChangesMade()
  }

  return yo`
    <div class="control">
      <label>${opts.label}</label>
      <textarea
        ${opts.isReadonly ? 'disabled' : ''}
        name="${opts.name}"
        placeholder="${opts.placeholder || ''}"
        oninput=${onInput}
      >${manifest[opts.name] || ''}</textarea>
      ${opts.help ? yo`<div class="help"><span class="fa fa-fw fa-info"></span> ${opts.help}</div>` : ''}
    </div>
  `
}

function thumbControl (url, opts) {
  function onClickThumb (e) {
    e.preventDefault()
    document.querySelector('.thumb-control input[type="file"]').click()
  }
  function onChooseFile (e) {
    var file = e.currentTarget.files[0]
    if (!file) return
    var fr = new FileReader()
    fr.onload = () => {
      changedValues.thumb = {
        ext: file.name.split('.').pop(),
        dataUrl: fr.result
      }
      document.querySelector('.thumb-control img').setAttribute('src', fr.result)
      setChangesMade()
    }
    fr.readAsDataURL(file)
  }
  return yo`
    <div class="control thumb-control">
      <label>Thumbnail</label>
      <img
        class="thumbnail ${opts.isReadonly ? 'readonly' : ''}"
        src="asset:thumb:${url}?cache_buster=${Date.now()}"
        onclick=${opts.isReadonly ? undefined : onClickThumb}
      >
      ${opts.isReadonly ? '' : yo`
        <input type="file" accept=".jpg,.jpeg,.png" onchange=${onChooseFile}>
      `}
    </div>
  `
}

function previewModeControl (archiveInfo) {
  const previewMode = _get(archiveInfo, 'userSettings.previewMode')

  return yo`
    <div class="control">
      <label class="toggle unweirded">
        <input
          type="checkbox"
          name="autoPublish"
          value="autoPublish"
          ${previewMode ? 'checked' : ''}
          onclick=${onTogglePreviewMode}
        >
        <div class="switch"></div>
        <span class="text">
          Preview mode
        </span>
      </label>
      <div class="help"><span class="fa fa-fw fa-info"></span> ${PREVIEW_MODE_HELP}</div>
    </div>`
}

function syncPathControl (archiveInfo) {
  if (archiveInfo.localSyncPathIsMissing) {
    return yo`
      <div class="control syncpath">
        <label>Local folder</label>
        
        <div class="message error">
          <span>This site's local folder was deleted or moved. (${archiveInfo.missingLocalSyncPath})</span>
        </div>

        <p>
          <button class="btn white" onclick=${onChangeSyncPath}>
            Choose new folder
          </button>
          <button class="btn white" onclick=${onRemoveSyncPath}>
            Remove
          </button>
        </p>
      </div>`
  }

  const path = _get(archiveInfo, 'userSettings.localSyncPath')
  if (path) {
    return yo`
    <div class="control syncpath">
      <label>Local folder</label>

      <p class="copy-path">
        <input type="text" disabled value="${path}"/>

        <span class="btn-group">
          <button class="btn white" onclick=${e => onCopy(e, path, 'Path copied to clipboard')}>
            Copy
          </button>

          <button class="btn white" onclick=${e => onOpenFolder(e, path)}>
            Open
          </button>
        </span>
      </p>

      <p>
        <button class="btn transparent" onclick=${onRemoveSyncPath}>
          <span class="fas fa-times"></span> Remove
        </button>
        <button class="btn transparent" onclick=${onChangeSyncPath}>
          Change local folder
        </button>
      </p>
    </div>`
  }

  return yo`
    <div class="control syncpath">
      <label>Local folder</label>

      <p>
        <button class="btn white" onclick=${onChangeSyncPath}>
          Set local folder
        </button>
      </p>

      <div class="help"><span class="fa fa-fw fa-info"></span> Set a local folder to access this site's files from outside of the browser.</div>
    </div>`
}

function permissionControl (manifest, opts) {
  function onChange (e, id) {
    changedValues.permissions = changedValues.permissions || {}
    changedValues.permissions[opts.perm] = changedValues.permissions[opts.perm] || {}
    changedValues.permissions[opts.perm][id] = e.currentTarget.checked
    setChangesMade()
  }

  return yo`
    <div class="control permission">
      <h5>${opts.label}</h5>
      <p><a class="link" href="${opts.documentation}">${opts.documentation}</a></p>
      ${opts.caps.map(({id, description}) => yo`
        <label><input
          ${opts.isReadonly ? 'disabled' : ''}
          type="checkbox"
          ${isPermSet(manifest, opts.perm, id) ? 'checked' : ''}
          onchange=${e => onChange(e, id)}
        > ${description}</label>
      `)}
    </div>
  `
}

function linkControl (manifest, opts) {
  function onInput (e) {
    changedValues.links = changedValues.links || {}
    changedValues.links[opts.name] = e.currentTarget.value
    setChangesMade()
  }

  var href = _get(manifest, `links.${opts.name}.0.href`, '')
  return yo`
    <div class="control">
      <label>${opts.label}</label>
      <input
        ${opts.isReadonly ? 'disabled' : ''}
        type="text"
        name="${opts.name}"
        placeholder="${opts.placeholder || ''}"
        value=${href}
        oninput=${onInput}
      >
      ${opts.help ? yo`<div class="help"><span class="fa fa-fw fa-info"></span> ${opts.help}</div>` : ''}
    </div>
  `
}

// events
// =

async function onSubmitSettings (e, workingCheckout, workingDatJson) {
  e.preventDefault()
  if (canSave) {
    // simple manifest-value changes
    for (let k in changedValues.manifest) {
      workingDatJson[k] = changedValues.manifest[k]
    }

    // link changes
    if (changedValues.links) {
      workingDatJson.links = workingDatJson.links || {}
      if (changedValues.links.payment) {
        workingDatJson.links.payment = [{href: changedValues.links.payment}]
      } else {
        delete workingDatJson.links
      }
    }

    // application-permission changes
    if (changedValues.permissions) {
      workingDatJson.application = workingDatJson.application || {}
      workingDatJson.application.permissions = workingDatJson.application.permissions || {}
      for (let perm in changedValues.permissions) {
        let capset = new Set(workingDatJson.application.permissions[perm])
        for (let cap in changedValues.permissions[perm]) {
          if (changedValues.permissions[perm][cap]) {
            capset.add(cap)
          } else {
            capset.delete(cap)
          }
        }
        workingDatJson.application.permissions[perm] = Array.from(capset)
      }
    }
    
    // write manifest
    await workingCheckout.writeFile('/dat.json', JSON.stringify(workingDatJson, null, 2))

    // write thumb
    if (changedValues.thumb) {
      let base64buf = changedValues.thumb.dataUrl.split(',').pop()
      await workingCheckout.unlink('/thumb.jpg').catch(err => {})
      await workingCheckout.unlink('/thumb.jpeg').catch(err => {})
      await workingCheckout.unlink('/thumb.png').catch(err => {})
      await workingCheckout.writeFile(`/thumb.${changedValues.thumb.ext}`, base64buf, 'base64')
    }

    // reset
    changedValues = {}
    canSave = false
    document.querySelector('#save-settings-form button').classList.add('disabled')
  }
}

function onToggleExpanded (id) {
  if (expandedSection) {
    try {
      document.querySelector(`section#${expandedSection}`).classList.add('collapsed')
    } catch (e) { /* ignore */ }
  }
  
  if (expandedSection === id) expandedSection = false
  else expandedSection = id
  sessionStorage.expandedSection = expandedSection

  if (expandedSection === id) {
    document.querySelector(`section#${id}`).classList.remove('collapsed')
  } else {
    document.querySelector(`section#${id}`).classList.add('collapsed')
  }
}

function onTogglePreviewMode (e) {
  e.preventDefault()
  e.stopPropagation()
  emit('editor-toggle-preview-mode')
}

function onChangeSyncPath (e) {
  e.preventDefault()
  e.stopPropagation()
  emit('editor-change-sync-path')
}

function onRemoveSyncPath (e) {
  e.preventDefault()
  e.stopPropagation()
  emit('editor-remove-sync-path')
}

function onCopy (e, str, successMessage = 'Copied to clipboard') {
  e.preventDefault()
  e.stopPropagation()
  writeToClipboard(str)
  toast.create(successMessage)
}

function onOpenFolder (e, path) {
  e.preventDefault()
  e.stopPropagation()
  beaker.browser.openFolder(path)
}

// helpers
// =

function isPermSet (manifest, perm, cap) {
  try {
    return manifest.application.permissions[perm].includes(cap)
  } catch (e) {
    return false
  }
}

function setChangesMade () {
  canSave = true
  document.querySelector('#save-settings-form button').classList.remove('disabled')
}