/* globals customElements */
import {LitElement, html, css} from '../../vendor/lit-element/lit-element'
import { classMap } from '../../vendor/lit-element/lit-html/directives/class-map'
import _get from 'lodash.get'
import * as bg from '../bg-process-rpc'
import buttonResetCSS from './button-reset.css'

class NavbarSiteInfo extends LitElement {
  static get properties () {
    return {
      url: {type: String},
      siteTitle: {type: String},
      siteSubtitle: {type: String},
      siteIcon: {type: String},
      siteTrust: {type: String},
      driveDomain: {type: String},
      writable: {type: Boolean},
      isPressed: {type: Boolean},
      hideOrigin: {type: Boolean, attribute: 'hide-origin'},
      rounded: {type: Boolean}
    }
  }

  constructor () {
    super()
    this.url = ''
    this.siteTitle = ''
    this.siteSubtitle = ''
    this.siteIcon = ''
    this.siteTrust = ''
    this.driveDomain = ''
    this.writable = false
    this.isPressed = false
    this.hideOrigin = false
    this.rounded = false
  }

  get scheme () {
    try {
      return (new URL(this.url)).protocol
    } catch (e) {
      return ''
    }
  }

  get hostname () {
    try {
      return (new URL(this.url)).hostname
    } catch (e) {
      return ''
    }
  }

  // rendering
  // =

  render () {
    var innerHTML
    if (this.siteIcon || this.siteTitle) {
      innerHTML = html`
        ${this.siteIcon === 'beaker-logo' ? html`
          <svg class="beaker-logo" viewBox="0 0 423.33333 423.33334">
            <g>
              <path
                d="m 200.89962,376.0479 c -24.73216,-1.58999 -50.03103,-9.19167 -71.4375,-21.46517 -22.17481,-12.71403 -41.770537,-31.08395 -55.750567,-52.2631 -21.57868,-32.69077 -30.78054,-71.64081 -26.07932,-110.38965 3.08365,-25.4163 11.91667,-49.42273 26.07932,-70.87855 5.92143,-8.97071 11.67851,-16.07078 19.58166,-24.149613 8.783677,-8.978953 16.400907,-15.324151 26.291127,-21.900673 16.86303,-11.213103 33.66176,-18.605574 52.91667,-23.286565 33.1993,-8.070963 66.14007,-5.907045 99.30693,6.523591 8.55737,3.20722 15.0652,4.616366 24.65855,5.339333 4.91048,0.37006 6.60707,0.329676 15.73451,-0.374531 5.6268,-0.434124 13.2468,-0.874368 16.93333,-0.97832 12.74853,-0.359481 18.3855,1.439679 20.55395,6.560239 1.54225,3.641861 1.58295,4.143194 1.84942,22.779822 0.27258,19.064617 0.52411,22.429417 2.29427,30.691657 1.29904,6.0633 2.38416,9.06084 5.94809,16.43101 10.13412,20.95726 15.29833,40.34326 16.79852,63.06025 1.5486,23.44986 -2.52328,48.80746 -11.36765,70.79207 -10.94619,27.20912 -28.1073,50.0767 -51.59882,68.75663 -4.51138,3.58735 -14.17744,10.08816 -19.75556,13.2864 -5.71429,3.27631 -16.55936,8.43954 -22.40138,10.66507 -22.80973,8.68939 -46.6421,12.33747 -70.55555,10.8001 z m 19.93194,-47.96386 c 29.14081,-2.50322 55.34477,-14.82307 75.17415,-35.34329 18.27114,-18.90769 29.06845,-41.81794 32.29806,-68.53161 0.61364,-5.07567 0.61364,-19.97154 0,-25.04722 -3.23107,-26.72572 -14.01866,-49.61537 -32.29806,-68.5316 -26.17801,-27.09003 -63.8503,-39.879737 -101.45609,-34.444247 -40.13126,5.800517 -74.90491,32.525387 -90.82786,69.804667 -4.448017,10.41383 -7.183307,20.87142 -8.722427,33.34757 -0.60148,4.87566 -0.59211,19.84443 0.0156,24.87083 3.23108,26.72573 14.018657,49.61538 32.298067,68.53161 19.64716,20.33165 46.03634,32.81965 74.64499,35.32384 4.89002,0.42803 14.00778,0.43743 18.87361,0.0194 z"
                style="stroke-width:0.352778" />
            </g>
          </svg>
        ` : html`
          <span class="${this.siteIcon} ${this.siteTrust}"></span>
        `}
        <span class="label">${this.siteTitle}</span>
        ${this.siteSubtitle ? html`<span class="label sublabel">${this.siteSubtitle}</span>` : ''}
      `
    }

    if (!innerHTML) {
      return html`<button class="hidden"></button>`
    }

    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <button class=${classMap({[this.siteTrust]: true, pressed: this.isPressed, 'hide-origin': this.hideOrigin, rounded: this.rounded})} @click=${this.onClickButton}>
        ${innerHTML}
      </button>
    `
  }

  // events
  // =

  async onClickButton (e) {
    if (Date.now() - (this.lastButtonClick||0) < 100) {
      return
    }
    this.isPressed = true
    var rect = e.currentTarget.getClientRects()[0]
    await bg.views.toggleSiteInfo({
      bounds: {
        top: (rect.bottom|0),
        left: (rect.left|0)
      }
    })
    this.isPressed = false
    this.lastButtonClick = Date.now()
  }
}
NavbarSiteInfo.styles = [buttonResetCSS, css`
:host {
  display: block;
  min-width: 5px;
}

button {
  border-radius: 0;
  border-top-left-radius: 16px;
  border-bottom-left-radius: 16px;
  height: 26px;
  line-height: 27px;
  padding: 0 12px 0 10px;
  background: var(--bg-color--cert--default);
  clip-path: polygon(0% 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

button:not(:disabled):hover {
  background: var(--bg-color--cert--default--hover);
}

button.trusted {
  background: var(--bg-color--cert--trusted);
}

button.trusted:hover {
  background: var(--bg-color--cert--trusted--hover);
}

button.untrusted {
  background: var(--bg-color--cert--untrusted);
}

button.untrusted:hover {
  background: var(--bg-color--cert--untrusted--hover);
}

button.hide-origin .label {
  display: none;
}

button.rounded {
  clip-path: none;
  border-radius: 16px;
  padding: 0 10px 0 10px;
  margin-right: 2px;
}

button.hidden {
  display: none;
}

.fa-exclamation-triangle,
.fa-check-circle {
  font-size: 12.5px;
  line-height: 27px;
}

.fa-user-check {
  font-size: 12px;
  line-height: 27px;
}

.beaker-logo {
  width: 16px;
  height: 16px;
  position: relative;
  top: 3px;
  margin: 0 -2px;
}

.beaker-logo path {
  fill: var(--text-color--cert--trusted);
}

.fa-user {
  font-size: 9px;
  position: relative;
  top: -1px;
}

.label {
  margin-left: 2px;
  margin-right: 2px;
  font-variant-numeric: tabular-nums;
  font-weight: 400;
  font-size: 12.5px;
  line-height: 27px;
  letter-spacing: 0.5px;
}

.label.sublabel {
  display: inline-block;
  height: 18px;
  line-height: 20px;
  border-radius: 4px;
  padding: 0 5px;
  background: var(--bg-color--cert-sublabel);
  color: var(--text-color--cert-sublabel);
}

.notrust {
  color: var(--text-color--cert--notrust);
}

.trusted {
  color: var(--text-color--cert--trusted);
}

.secure {
  color: var(--text-color--cert--secure);
}

.warning {
  color: var(--text-color--cert--warning);
}

.untrusted {
  color: var(--text-color--cert--untrusted);
}
`]
customElements.define('shell-window-navbar-site-info', NavbarSiteInfo)
