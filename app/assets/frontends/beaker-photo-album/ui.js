var self = hyperdrive.self

function h (tag, attrs, ...children) {
  var el = document.createElement(tag)
  for (let k in attrs) {
    if (typeof attrs[k] === 'function') {
      el.addEventListener(k, attrs[k])
    } else {
      el.setAttribute(k, attrs[k])
    }
  }
  for (let child of children) el.append(child)
  return el
}

customElements.define('photo-album-app', class extends HTMLElement {
  constructor () {
    super()
    this.siteInfo = undefined
    this.photos = []
  }

  connectedCallback () {
    this.load()
  }

  async load () {
    this.siteInfo = await self.getInfo()
    this.photos = await self.readdir('/photos').catch(e => ([]))

    this.append(h('header', {}, 
      h('h1', {},
        this.siteInfo.title || 'Untitled Photo Album',
        ' ',
        this.siteInfo.writable
          ? h('small', {}, h('a', {href: '#', click: this.onEditInfo.bind(this)}, 'edit'))
          : ''
      ),
      (this.siteInfo.description)
        ? h('p', {}, this.siteInfo.description)
        : '',
      this.siteInfo.writable
        ? h('button', {click: this.onAdd.bind(this)}, '+ Add Photo')
        : '',
      h('input', {type: 'file', accept: '.jpg,.jpeg,.png', change: this.onSelectAdded.bind(this)})
    ))
    this.append(h('div', {class: 'photos'}))
    this.renderPhotos()
  }

  renderPhotos () {
    var container = this.querySelector('.photos')
    container.innerHTML = ''
    for (let photo of this.photos) {
      container.append(
        h('div', {class: 'photo', click: e => this.doViewModal(e, photo)},
          h('img', {src: `/photos/${photo}`, alt: photo})
        )
      )
    }
    if (this.photos.length === 0) {
      container.append(h('div', {class: 'empty'}, 'This album has no photos'))
    }
  }

  onAdd () {
    this.querySelector('input[type="file"]').click()
  }

  onSelectAdded (e) {
    var file = e.currentTarget.files[0]
    if (!file) return
    var fr = new FileReader()
    fr.onload = async () => {
      var ext = file.name.split('.').pop()
      var name = `${Date.now()}.${ext}`
      await self.mkdir('/photos').catch(e => undefined)
      await self.writeFile(`/photos/${name}`, fr.result, 'binary')
      this.photos.push(name)
      this.renderPhotos()

    }
    fr.readAsArrayBuffer(file)
  }

  onRemove (photo) {
    if (!confirm('Remove this photo?')) {
      return
    }

    this.photos.splice(this.photos.indexOf(photo), 1)
    // TODO save
    this.renderPhotos()
  }

  async onEditInfo (e) {
    e.preventDefault()
    await navigator.drivePropertiesDialog(self.url)
    location.reload()
  }

  async doViewModal (e, photo) {
    e.stopPropagation()

    var existingDialog = this.querySelector('dialog')
    if (existingDialog) existingDialog.remove()

  console.log(await self.stat(`/photos/${photo}`))
    var description = (await self.stat(`/photos/${photo}`).catch(e => {}))?.metadata?.description

    var dialog = h('dialog', {},
      h('div', {},
        h('img', {src: `/photos/${photo}`}),
        h('div', {},
          this.siteInfo.writable
            ? h('div', {class: 'ctrls'},
              h('button', {class: 'red', click: onDelete}, 'Delete Photo')
            )
            : '',
          h('div', {class: 'description'},
            description ? description : h('em', {}, 'No description'),
          ),
          this.siteInfo.writable
            ? h('div', {class: 'description'}, h('a', {href: '#', click: onShowEditDescription}, 'Edit'))
            : '',
          h('form', {class: 'edit-description'},
            h('textarea', {}, description || ''),
            h('div', {class: 'form-actions'},
              h('button', {class: 'noborder', click: onHideEditDescription}, 'Cancel'),
              h('button', {click: onSaveEditDescription}, 'Save')
            )
          )
        )
      )
    )

    function onShowEditDescription (e) {
      e.preventDefault()
      dialog.classList.add('editing-description')
      dialog.querySelector('.edit-description textarea').focus()
    }

    function onHideEditDescription (e) {
      e.preventDefault()
      dialog.classList.remove('editing-description')
    }

    async function onSaveEditDescription (e) {
      e.preventDefault()
      dialog.classList.remove('editing-description')

      description = dialog.querySelector('.edit-description textarea').value
      dialog.querySelector('.description').textContent = description
      console.log('writing', `/photos/${photo}`, {description})
      await self.updateMetadata(`/photos/${photo}`, {description})
    }

    async function onDelete (e) {
      if (!confirm('Delete this photo?')) {
        return
      }
      await self.unlink(`/photos/${photo}`)
      location.reload()
    }

    this.append(dialog)
    dialog.showModal()
  }
})

document.body.addEventListener('click', e => {
  var existingDialog = document.querySelector('dialog')
  if (existingDialog && e.path[0] === existingDialog) {
    existingDialog.remove()
  }
})