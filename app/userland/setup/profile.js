import { commonCSS } from './common-css.js'

customElements.define('profile-view', class extends HTMLElement {
  constructor () {
    super()
    this.title = ''
    this.description = ''
    this.thumbDataURL = ''
    this.thumbExt = ''
    this.errors = {}

    this.shadow = this.attachShadow({mode: 'open'})
    this.render()
    setTimeout(() => this.setAttribute('active', true), 1)
  }

  render () {
    this.shadow.innerHTML = `
<h1>New user</h1>
<form>
  <div class="img-ctrl">
    <img src="${this.thumbDataURL || 'beaker://assets/default-user-thumb'}">
    <input type="file" accept=".jpg,.jpeg,.png">
    <button type="button" class="btn choose-image" tabindex="4">Choose Picture</button>
  </div>

  ${this.errors.general ? `<div class="error">${this.errors.general}</div>` : ''}

  <label for="title">Name</label>
  <input autofocus name="title" tabindex="2" value="${this.title || ''}" class="${this.errors.title ? 'has-error' : ''}">
  ${this.errors.title ? `<div class="error">${this.errors.title}</div>` : ''}

  <label for="description">Description</label>
  <input name="description" tabindex="3" value="${this.description || ''}" placeholder="Optional" class="${this.errors.description ? 'has-error' : ''}">
  ${this.errors.description ? `<div class="error">${this.errors.description}</div>` : ''}

  <div class="form-actions">
    <div>
      <button type="submit" class="btn primary" tabindex="5">Next &raquo;</button>
    </div>
  </div>
</form>
<style>
  ${commonCSS}

  :host {
    display: block;
    padding: 0 10px;
    opacity: 0;
    transition: opacity 0.5s;
  }
  :host([active]) {
    opacity: 1;
  }

  h1 {
    font-weight: 500;
    color: #aab;
    margin-top: 13px;
  }

  form {
    padding: 15px 90px 0;
  }

  .img-ctrl {
    display: flex;
    align-items: center;
    margin: 0px 0 20px 70px;
  }
  
  img {
    border-radius: 50%;
    object-fit: cover;
    width: 130px;
    height: 130px;
    margin-right: 10px;
  }
    
  input[type="file"] {
    display: none;
  }

  form input,
  form textarea {
    margin-bottom: 20px;
  }
  
  .form-actions {
    position: fixed;
    bottom: 10px;
    right: 10px;
  }
</style>
    `

    this.shadow.querySelector('form').addEventListener('submit', this.onSubmit.bind(this))
    this.shadow.querySelector('input[type="file"]').addEventListener('change', this.onChooseThumbFile.bind(this))
    this.shadow.querySelector('.choose-image').addEventListener('click', this.onClickChangeThumb.bind(this))
  }

  onClickChangeThumb (e) {
    e.preventDefault()
    this.shadow.querySelector('input[type="file"]').click()
  }

  onChooseThumbFile (e) {
    var file = e.currentTarget.files[0]
    if (!file) return
    var fr = new FileReader()
    fr.onload = () => {
      this.thumbExt = file.name.split('.').pop()
      this.thumbDataURL = /** @type string */(fr.result)
      this.shadow.querySelector('img').setAttribute('src', this.thumbDataURL)
    }
    fr.readAsDataURL(file)
  }

  async onSubmit (e) {
    e.preventDefault()

    // get values
    var form = e.currentTarget
    this.title = form.title.value
    this.description = form.description.value

    // validate
    this.errors = {}
    if (!this.title) this.errors.title = 'Required'
    if (Object.keys(this.errors).length > 0) {
      return this.render()
    }

    if (!this.thumbDataURL) {
      // use default thumb
      let blob = await (await fetch('beaker://setup/default-user-thumb')).blob()
      this.thumbDataURL = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onerror = reject
        reader.onload = () => resolve(reader.result)
        reader.readAsDataURL(blob)
      })
    }

    try {
      var thumbBase64 = this.thumbDataURL ? this.thumbDataURL.split(',').pop() : undefined
      await beaker.users.setupDefault({
        title: this.title,
        description: this.description,
        thumbBase64,
        thumbExt: this.thumbExt
      })
    } catch (e) {
      this.errors.general = e.message || e.toString()
      return this.render()
    }

    this.removeAttribute('active')
    setTimeout(() => {
      this.dispatchEvent(new CustomEvent('next', {bubbles: true, composed: true}))
    }, 500)
  }
})