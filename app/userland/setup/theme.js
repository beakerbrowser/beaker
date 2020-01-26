import { commonCSS } from './common-css.js'

customElements.define('theme-view', class extends HTMLElement {
  constructor () {
    super()
    this.theme = undefined

    this.shadow = this.attachShadow({mode: 'open'})
    this.render()
    setTimeout(() => this.setAttribute('active', true), 1)
  }

  render () {
    this.shadow.innerHTML = `
<h1>Choose your profile theme</h1>
<form>
  <div class="theme">
    <img src="beaker://assets/img/themes/none-actually.png">
    <div class="selector">
      <select>
        <option value="">Files Listing</option>
        <option value="builtin:blogger">Blogger</option>
      </select>
    </div>
  </div>
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
    margin: 34px 0px 20px;
    text-align: center;
  }

  form {
    padding: 15px 0 0;
  }

  .theme img {
    display: block;
    width: 540px;
    height: 280px;
    object-fit: cover;
    margin: 0 auto;
    outline: 1px solid #ccd;
  }

  .theme .selector {
    text-align: center;
    padding: 10px 0;
  }

  .theme .selector select {
    -webkit-appearance: none;
    display: inline-block;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0.5px;
    color: #444;
    padding: 10px 30px 10px 10px;
    max-width: 100%;
    border: 1px solid #bbc;
    border-radius: 4px;
    outline: 0;
    background-color: #fff;
    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAMAAABg3Am1AAAARVBMVEUAAAAsPlAsPlAsPlAsPlAsPlAsPlAsPlAsPlAsPlAsPlAsPlAsPlAsPlAsPlAsPlAsPlAsPlAsPlAsPlAsPlAsPlAsPlAz1sU3AAAAFnRSTlMAAwQMERkbIikuVWl0dXeDtLXF5PH5X4+8lwAAAIxJREFUSInt0TcCwjAQRNFvE5dkwKD7H5WGINsKszWa+r9qoO1ftjqc1B0N2DyDYwNcPX0Ia0Yf2HFx9Y+e7u4Be6B3CAOXsPcTqrDvd5qw6G1FxL0ipn1dzPuaWPZlkepLIt3nRa7PiXyfFqU+Jcr9UtT6uaj3U6H0sdD6n1D7j9B76M7jbevo29rgBddTP/7iwZL3AAAAAElFTkSuQmCC);
    background-repeat: no-repeat;
    background-position: right .7em top 50%, 0 0;
    background-size: .65em auto, 100%;
  }
  
  .form-actions {
    position: fixed;
    bottom: 10px;
    right: 10px;
  }
</style>
    `

    this.shadow.querySelector('form').addEventListener('submit', this.onSubmit.bind(this))
    this.shadow.querySelector('select').addEventListener('change', this.onChangeTheme.bind(this))
  }

  onChangeTheme (e) {
    e.preventDefault()
    this.theme = e.currentTarget.value
    this.shadow.querySelector('.theme img').setAttribute('src', `beaker://assets/img/themes/${this.theme ? this.theme.slice('builtin:'.length) : 'none-actually'}.png`)
  }


  async onSubmit (e) {
    e.preventDefault()

    if (this.theme) {
      var {url} = await beaker.users.getDefault()
      console.log('url', url)
      var drive = new Hyperdrive(url)
      await drive.configure({theme: this.theme})
      console.log('configured', this.theme)
    }

    this.removeAttribute('active')
    setTimeout(() => {
      this.dispatchEvent(new CustomEvent('next', {bubbles: true, composed: true}))
    }, 500)
  }
})