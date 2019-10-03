/* globals beaker DatArchive confirm */

import yo from 'yo-yo'
import {EventEmitter} from 'events'

// TODO this is incomplete

export class TemplateSelector extends EventEmitter {
  constructor (siteInfo) {
    super()
    this.el = null
    this.userTemplates = []
  }

  async setup () {
    this.userTemplates = await beaker.templates.list()
    this.rerender()
  }

  // rendering
  // =

  rerender () {
    if (this.el) {
      yo.update(this.el, this.render())
    }
  }

  render () {
    var el = yo`
      <div class="template-selector">
        <div class="template-selector-grid">
          ${this.userTemplates.map(t => this.renderTemplateItem(t, true))}
        </div>
      </div>`
    this.el = this.el || el
    return el
  }

  renderTemplateItem ({url, title, disabled}) {
    var screenshotUrl = `beaker://templates/screenshot/${url}`

    return yo`
      <div
        class="template-item${disabled ? ' disabled' : ''}"
        onclick=${disabled ? undefined : e => this.onSelectTemplate(e, url)}
        oncontextmenu=${disabled ? undefined : e => this.onContextmenuTemplate(e, {url, title})}
      >
        <img src=${screenshotUrl} />
        <div class="label"><span>${title}</span></div>
      </div`
  }

  // event handlers
  // =

  async onSelectTemplate (e, template) {
    e.preventDefault()
    e.stopPropagation()

    if (template === 'blank') {
      template = false
    }

    // create the dat
    // TODO -- if using a dat template, need to decide whether to fork from dat:// or an internal snapshot -prf
    var archive
    if (template && template.startsWith('dat://')) {
      archive = await DatArchive.fork(template, {prompt: false})
    } else {
      archive = await DatArchive.create({template, prompt: false})
    }

    var redirectUrl = archive.url
    if (!template) {
      // for the blank template, go to the source view
      redirectUrl = `beaker://editor/${archive.url}#setup`
    }
    this.emit('created', {archive, redirectUrl})
  }

  async onContextmenuTemplate (e, template) {
    e.preventDefault()
    e.stopPropagation()
    var {url} = template

    // TODO
    // select the template
    // this.selectedTemplate = url
    // this.rerender()

    // if (url !== 'blank' && url !== 'website') {
    //   // show the context menu
    //   const items = [
    //     { icon: 'trash', label: 'Delete template', click: () => this.onClickDeleteTemplate(template) }
    //   ]
    //   await contextMenu.create({x: e.clientX, y: e.clientY, items})
    // }
  }

  async onClickDeleteTemplate (template) {
    // confirm
    if (!confirm(`Remove ${template.title}?`)) {
      return
    }

    // remove
    await beaker.templates.remove(template.url)
    this.selectedTemplate = 'blank'
    this.setup()
  }
}
