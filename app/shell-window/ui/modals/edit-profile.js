/* globals DatArchive */

import * as yo from 'yo-yo'
import {BaseModal} from './base'

const CANVAS_SIZE = 125

// exported api
// =

export class EditProfileModal extends BaseModal {
  constructor (opts) {
    super(opts)

    this.archive = new DatArchive(opts.url)
    this.title = opts.title || ''
    this.description = opts.description || ''

    this.loadedImg = false
    this.loadImg(`${opts.url}/thumb.jpg?cache_buster=${Date.now()}`)
  }

  // rendering
  // =

  render () {
    setTimeout(() => this.updateCanvas(), 1)
    return yo`
      <div class="edit-profile-modal">
        <h1 class="title">Edit your profile</h1>

        <div class="thumb-ctrl">
          <canvas id="thumb-canvas" width=${CANVAS_SIZE} height=${CANVAS_SIZE} onclick=${e => this.onClickThumb(e)}></canvas>
        </div>

        <form onsubmit=${e => this.onSubmit(e)}>
          <label for="title">Your name</label>
          <input autofocus name="title" tabindex="2" value=${this.title || ''} placeholder="Name" onchange=${e => this.onChangeTitle(e)} />

          <label for="desc">Your bio</label>
          <textarea name="desc" tabindex="3" placeholder="Bio (optional)" onchange=${e => this.onChangeDescription(e)}>${this.description || ''}></textarea>

          <div class="form-actions">
            <button type="button" onclick=${e => this.onClickCancel(e)} class="btn cancel" tabindex="4">Cancel</button>
            <button type="submit" class="btn success" tabindex="5">Save</button>
          </div>
        </form>
      </div>`
  }

  // canvas handling
  // =

  loadImg (url) {
    this.zoom = 1
    this.img = document.createElement('img')
    this.img.src = url
    this.img.onload = () => {
      var smallest = (this.img.width < this.img.height) ? this.img.width : this.img.height
      this.zoom = CANVAS_SIZE / smallest
      this.updateCanvas()
    }
  }

  updateCanvas () {
    var canvas = document.getElementById('thumb-canvas')
    if (canvas) {
      var ctx = canvas.getContext('2d')
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
      ctx.save()
      ctx.scale(this.zoom, this.zoom)
      ctx.drawImage(this.img, 0, 0, this.img.width, this.img.height)
      ctx.restore()
    }
  }

  // event handlers
  // =

  async onClickThumb (e) {
    var filenames = await beaker.browser.showOpenDialog({
      title: 'Choose thumbnail',
      filters: [{name: 'Images', extensions: ['jpg', 'jpeg', 'png']}],
      properties: ['openFile']
    })
    if (filenames[0]) {
      var base64buf = await beaker.browser.readFile(filenames[0], 'base64')
      var ext = filenames[0].split('.').pop()
      this.loadImg(`data:image/${ext};base64,${base64buf}`)
      this.loadedImg = {ext, base64buf}
    }
  }

  onChangeTitle (e) {
    this.title = e.target.value
  }

  onChangeDescription (e) {
    this.description = e.target.value
  }

  onClickCancel (e) {
    e.preventDefault()
    this.close(new Error('Canceled'))
  }

  async onSubmit (e) {
    e.preventDefault()
    try {
      if (this.loadedImg) {
        await this.archive.writeFile(`/thumb.${this.loadedImg.ext}`, this.loadedImg.base64buf, 'base64')
      }
      await this.archive.configure({
        title: this.title,
        description: this.description
      })
      this.close(null)
    } catch (e) {
      this.close(e.message || e.toString())
    }
  }
}
