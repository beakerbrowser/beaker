export class BaseSlideView extends HTMLElement {
  constructor () {
    super()
    this.shadow = this.attachShadow({mode: 'open'})
    this.outerRender()
    setTimeout(() => this.setAttribute('fadein', true), 1)

    var nextAnchor = this.shadow.querySelector('a')
    if (nextAnchor) {
      nextAnchor.addEventListener('click', e => {
        this.setAttribute('fadeout', true)
        setTimeout(() => {
          this.dispatchEvent(new CustomEvent('next', {bubbles: true, composed: true}))
        }, 500)
      })
    }
  }

  outerRender () {
    this.shadow.innerHTML = `
<link rel="stylesheet" href="beaker://assets/font-awesome.css">
<style>
  :host {
    -webkit-app-region: drag;
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    width: 100vw;
    background: #fff;
    padding: 0 20px;
    box-sizing: border-box;
  }
  h1 {
    font-weight: 500;
    font-size: 21px;
    margin: 30px 0 0;
    text-align: left;
  }
  h1 strong {
    font-size: 42px;
  }
  hr {
    border: 0;
    border-top: 1px solid #ccd;
  }
  a {
    position: fixed;
    left: 50%;
    bottom: 30px;
    transform: translateX(-50%);
    color: #2864dc;
    font-size: 21px;
    -webkit-app-region: no-drag;
  }
  a:hover {
    cursor: pointer;
    text-decoration: underline;
  }
  .bullet {
    display: inline-block;
    margin: 0 25px;
  }
</style>
${this.render()}
`
  }

  render () {
    return 'Replaceme'
  }
}