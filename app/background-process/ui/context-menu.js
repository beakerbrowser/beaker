import { app, Menu, clipboard, BrowserWindow, dialog } from 'electron'
import path from 'path'
import { download } from './downloads'

export default function registerContextMenu () {
  // register the context menu on every created webContents
  app.on('web-contents-created', (e, webContents) => {
    webContents.on('context-menu', async (e, props) => {
      var menuItems = []
      const { mediaFlags, editFlags } = props
      const hasText = props.selectionText.trim().length > 0
      const can = type => editFlags[`can${type}`] && hasText

      // get the focused window, ignore if not available (not in focus)
      // - fromWebContents(webContents) doesnt seem to work, maybe because webContents is often a webview?
      var targetWindow = BrowserWindow.getFocusedWindow()
      if (!targetWindow) { return }

      // ignore clicks on the shell window
      if (props.pageURL == 'beaker://shell-window') { return }

      // helper to call code on the element under the cursor
      const callOnElement = js => webContents.executeJavaScript(`
        var el = document.elementFromPoint(${props.x}, ${props.y})
        new Promise(resolve => { ${js} })
      `)

      // fetch custom menu information
      try {
        var customMenu = await callOnElement(`
          if (!el) {
            return resolve(null)
          }

          // check for a context menu setting
          var contextMenuId
          while (el && el.getAttribute) {
            contextMenuId = el.getAttribute('contextmenu')
            if (contextMenuId) break
            el = el.parentNode
          }
          if (!contextMenuId) {
            return resolve(null)
          }

          // lookup the context menu el
          var contextMenuEl = document.querySelector('menu#' + contextMenuId)
          if (!contextMenuEl) {
            return resolve(null)
          }

          // extract the menu items that are commands
          var menuItemEls = contextMenuEl.querySelectorAll('menuitem, hr')
          resolve(Array.from(menuItemEls)
            .filter(el => {
              if (el.tagName === 'HR') return true
              var type = el.getAttribute('type')
              return !type || type.toLowerCase() === 'command'
            })
            .map(el => {
              if (el.tagName === 'HR') return { type: 'separator' }
              return {
                menuId: contextMenuId,
                type: 'command',
                disabled: el.getAttribute('disabled'),
                label: el.getAttribute('label')
              }
            })
          )
        `)
      } catch (e) {
        console.error('Error checking for a custom context menu', e)
      }
      if (customMenu && customMenu.length) {
        // add to the menu, with a 10 item limit
        customMenu.slice(0, 10).forEach(customItem => {
          if (customItem.type === 'separator') {
            menuItems.push({ type: 'separator' })
          } else if (customItem.label.trim()) {
            menuItems.push({
              label: customItem.label,
              click: () => webContents.executeJavaScript(`
                var el = document.querySelector('#${customItem.menuId} menuitem[label="${customItem.label}"]')
                var evt = new MouseEvent('click', {bubbles: true, cancelable: true, view: window})
                el.dispatchEvent(evt)
              `),
              enabled: customItem.disabled === null
            })
          }
        })
        menuItems.push({ type: 'separator' })
      }

      // helper to run a download prompt for media
      const downloadPrompt = (item, win) => {
        var defaultPath = path.join(app.getPath('downloads'), path.basename(props.srcURL))
        dialog.showSaveDialog({ title: `Save ${props.mediaType} as...`, defaultPath }, filepath => {
          if (filepath) { download(win, props.srcURL, { saveAs: filepath }) }
        })
      }

      // links
      if (props.linkURL && props.mediaType === 'none') {
        menuItems.push({ label: 'Open Link in New Tab', click: (item, win) => win.webContents.send('command', 'file:new-tab', props.linkURL) })
        menuItems.push({ label: 'Copy Link Address', click: () => clipboard.writeText(props.linkURL) })
        menuItems.push({ type: 'separator' })
      }

      // images
      if (props.mediaType == 'image') {
        menuItems.push({ label: 'Save Image As...', click: downloadPrompt })
        menuItems.push({ label: 'Copy Image', click: () => webContents.copyImageAt(props.x, props.y) })
        menuItems.push({ label: 'Copy Image URL', click: () => clipboard.writeText(props.srcURL) })
        menuItems.push({ label: 'Open Image in New Tab', click: (item, win) => win.webContents.send('command', 'file:new-tab', props.srcURL) })
        menuItems.push({ type: 'separator' })
      }

      // videos and audios
      if (props.mediaType == 'video' || props.mediaType == 'audio') {
        menuItems.push({ label: 'Loop', type: 'checkbox', checked: mediaFlags.isLooping, click: () => callOnElement('el.loop = !el.loop') })
        if (mediaFlags.hasAudio) { menuItems.push({ label: 'Muted', type: 'checkbox', checked: mediaFlags.isMuted, click: () => callOnElement('el.muted = !el.muted') }) }
        if (mediaFlags.canToggleControls) { menuItems.push({ label: 'Show Controls', type: 'checkbox', checked: mediaFlags.isControlsVisible, click: () => callOnElement('el.controls = !el.controls') }) }
        menuItems.push({ type: 'separator' })
      }

      // videos
      if (props.mediaType == 'video') {
        menuItems.push({ label: 'Save Video As...', click: downloadPrompt })
        menuItems.push({ label: 'Copy Video URL', click: () => clipboard.writeText(props.srcURL) })
        menuItems.push({ label: 'Open Video in New Tab', click: (item, win) => win.webContents.send('command', 'file:new-tab', props.srcURL) })
        menuItems.push({ type: 'separator' })
      }

      // audios
      if (props.mediaType == 'audio') {
        menuItems.push({ label: 'Save Audio As...', click: downloadPrompt })
        menuItems.push({ label: 'Copy Audio URL', click: () => clipboard.writeText(props.srcURL) })
        menuItems.push({ label: 'Open Audio in New Tab', click: (item, win) => win.webContents.send('command', 'file:new-tab', props.srcURL) })
        menuItems.push({ type: 'separator' })
      }

      // clipboard
      if (props.isEditable) {
        menuItems.push({ label: 'Cut', role: 'cut', enabled: can('Cut') })
        menuItems.push({ label: 'Copy', role: 'copy', enabled: can('Copy') })
        menuItems.push({ label: 'Paste', role: 'paste', enabled: editFlags.canPaste })
        menuItems.push({ type: 'separator' })
      } else if (hasText) {
        menuItems.push({ label: 'Copy', role: 'copy', enabled: can('Copy') })
        menuItems.push({ type: 'separator' })
      }

      // dat items
      if (props.pageURL.startsWith('dat://')) {
        menuItems.push({ label: 'Fork this site', click: (item, win) => win.webContents.executeJavaScript(`DatArchive.fork("${props.pageURL}").catch(()=>{})`) })
        menuItems.push({ type: 'separator' })
      }

      // view source
      if (!props.pageURL.startsWith('beaker://')) {
        var viewSourceURL = props.pageURL
        if (props.pageURL.startsWith('dat://')) viewSourceURL = props.pageURL.slice('dat://'.length)
        menuItems.push({ label: 'View Source',
          click: (item, win) => {
            win.webContents.send('command', 'file:new-tab', 'beaker://view-source/' + viewSourceURL)
          }})
      }

      // inspector
      menuItems.push({ label: 'Inspect Element',
        click: item => {
          webContents.inspectElement(props.x, props.y)
          if (webContents.isDevToolsOpened()) { webContents.devToolsWebContents.focus() }
        }})

      // show menu
      var menu = Menu.buildFromTemplate(menuItems)
      menu.popup(targetWindow, {async: true})
    })
  })
}
