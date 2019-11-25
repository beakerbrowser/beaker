import { html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import * as toast from 'beaker://app-stdlib/js/com/toast.js'
import { joinPath, pluralize } from 'beaker://app-stdlib/js/strings.js'
import * as contextMenu from 'beaker://app-stdlib/js/com/context-menu.js'
import { doCopy, doMove, canWriteTo } from './files.js'

export async function handleDragDrop (targetEl, x, y, targetPath, dataTransfer) {
  console.log(targetPath, window.location.pathname)
  if (targetPath === window.location.pathname) {
    // TODO:
    // currently we ignore drops that are onto the current location
    // eventually drops may come from other tabs and we need to handle those
    // -prf
    return
  }

  if (targetEl) {
    targetEl.classList.add('drop-target')
  }

  var text = dataTransfer.getData('text/plain')
  if (text) {
    await handleDragDropUrls(x, y, targetPath, text.split('\n'))
  }
  // TODO: handle dropped files

  if (targetEl) {
    targetEl.classList.remove('drop-target')
  }
}

export async function handleDragDropUrls (x, y, targetPath, urls) {
  var targetUrl = joinPath(window.location.origin, targetPath)
  var targetName = targetPath.split('/').pop()
  var items
  if (await canWriteTo(targetUrl)) {
    items = [
      html`<div class="section-header small light">${urls.length} ${pluralize(urls.length, 'item')}...</div>`,
      {
        icon: 'far fa-copy',
        label: `Copy to ${targetName}`,
        async click () {
          for (let url of urls) {
            try {
              await doCopy({sourceItem: url, targetFolder: targetUrl})
            } catch (e) {
              console.error(e)
              toast.create(`Failed to copy ${url.split('/').pop()}: ${e.toString().replace('Error: ', '')}`, 'error')
              return
            }
            toast.create(`Copied ${urls.length} items`)
          }
        }
      },
      {
        icon: 'cut',
        label: `Move to ${targetName}`,
        async click () {
          for (let url of urls) {
            try {
              await doMove({sourceItem: url, targetFolder: targetUrl})
            } catch (e) {
              console.error(e)
              toast.create(`Failed to move ${url.split('/').pop()}: ${e.toString().replace('Error: ', '')}`, 'error')
              return
            }
            toast.create(`Move ${urls.length} items`)
          }
        }
      },
      '-',
      {
        icon: 'times-circle',
        label: `Cancel`,
        click: () => {}
      }
    ]
  } else {
    items = [
      html`<div class="section-header small light"><span class="fas fa-fw fa-exclamation-triangle"></span> Can't drop here</div>`,
      html`<div class="section-header" style="font-size: 14px">The target folder is read-only.</div>`,
      '-',
      {
        icon: 'times-circle',
        label: `Cancel`,
        click: () => {}
      }
    ]
  }
  await contextMenu.create({
    x,
    y,
    roomy: false,
    noBorders: true,
    fontAwesomeCSSUrl: 'beaker://assets/font-awesome.css',
    style: `padding: 4px 0`,
    items
  })
}