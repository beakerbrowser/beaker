import { html } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import * as toast from '../../../app-stdlib/js/com/toast.js'
import * as contextMenu from '../../../app-stdlib/js/com/context-menu.js'
import { EditBookmarkPopup } from '../com/edit-bookmark-popup.js'

export async function showContextMenu ({x, y}) {
  const driveCreator = (type = undefined) => async () => {
    var drive = await DatArchive.create({type})
    toast.create('Drive created')
    beaker.browser.openUrl(drive.url, {setActive: true})
  }

  const createBookmark = async () => {
    var b = await EditBookmarkPopup.create()
    await beaker.bookmarks.add(b)
    location.reload()
  }

  await contextMenu.create({
    x,
    y,
    noBorders: true,
    roomy: true,
    fontAwesomeCSSUrl: 'beaker://assets/font-awesome.css',
    style: `padding: 4px 0`,
    items: [
      {icon: 'far fa-fw fa-star', label: 'Bookmark', click: createBookmark},
      '-',
      html`<div class="section-header light small">Basic</div>`,
      {icon: 'far fa-fw fa-folder-open', label: 'Hyperdrive', click: driveCreator()},
      {icon: 'fas fa-fw fa-sitemap', label: 'Website', click: driveCreator('website')},
      '-',
      html`<div class="section-header light small">Advanced</div>`,
      {icon: 'fas fa-fw fa-drafting-compass', label: 'Application', click: driveCreator('application')},
      {icon: 'fas fa-fw fa-terminal', label: 'Webterm Command', click: driveCreator('webterm.sh/cmd-pkg')},
    ]
  })
}
