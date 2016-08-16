import { app, Menu, clipboard, BrowserWindow, dialog } from 'electron'
import url from 'url'
import path from 'path'
import { download } from './downloads'
import { getProtocolDescription } from '../browser'

export default function registerContextMenu () {
  // register the context menu on every created webContents
  app.on('web-contents-created', (e, webContents) => {
    webContents.on('context-menu', (e, props) => {
      var menuItems = []
      const { mediaFlags, editFlags } = props
      const hasText = props.selectionText.trim().length > 0
      const can = type => editFlags[`can${type}`] && hasText

      // get the focused window, ignore if not available (not in focus)
      // - fromWebContents(webContents) doesnt seem to work, maybe because webContents is often a webview?
      var targetWindow = BrowserWindow.getFocusedWindow()
      if (!targetWindow)
        return

      // ignore clicks on the shell window
      if (props.pageURL == 'beaker:shell-window')
        return

      // helper to call code on the element under the cursor
      const callOnElement = js => {
        webContents.executeJavaScript(`
          var el = document.elementFromPoint(${props.x}, ${props.y})
          ${js}
        `)
      }

      // helper to run a download prompt for media
      const downloadPrompt = (item, win) => {
        var defaultPath = path.join(app.getPath('downloads'), path.basename(props.srcURL))
        dialog.showSaveDialog({ title: `Save ${props.mediaType} as...`, defaultPath }, filepath => {
          if (filepath)
            download(win, props.srcURL, { saveAs: filepath })
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
        if (mediaFlags.hasAudio)
          menuItems.push({ label: 'Muted', type: 'checkbox', checked: mediaFlags.isMuted, click: () => callOnElement('el.muted = !el.muted') })
        if (mediaFlags.canToggleControls)
          menuItems.push({ label: 'Show Controls', type: 'checkbox', checked: mediaFlags.isControlsVisible, click: () => callOnElement('el.controls = !el.controls') })
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
      }
      else if (hasText) {
        menuItems.push({ label: 'Copy', role: 'copy', enabled: can('Copy') })
        menuItems.push({ type: 'separator' })      
      }

      // inspector
      menuItems.push({ label: 'Inspect Element', click: item => {
        webContents.inspectElement(props.x, props.y)
        if (webContents.isDevToolsOpened())
          webContents.devToolsWebContents.focus()
      }})

      // protocol
      var urlp = url.parse(props.frameURL||props.pageURL)
      var pdesc = getProtocolDescription(urlp.protocol)
      if (pdesc && pdesc.contextMenu && Array.isArray(pdesc.contextMenu)) {
        menuItems.push({ type: 'separator' })
        pdesc.contextMenu.forEach(item => {
          menuItems.push({
            label: item.label,
            click: (_, win) => item.click(win, props)
          })
        })
      }

      // show menu
      var menu = Menu.buildFromTemplate(menuItems)
      menu.popup(targetWindow)
    })
  })
}