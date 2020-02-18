import {css} from '../../app-stdlib/vendor/lit-element/lit-element.js'
import buttonsCSS from '../../app-stdlib/css/buttons2.css.js'
import inputsCSS from '../../app-stdlib/css/inputs.css.js'
import tooltipCSS from '../../app-stdlib/css/tooltip.css.js'
import formCSS from './form.css.js'

const cssStr = css`
${buttonsCSS}
${inputsCSS}
${tooltipCSS}
${formCSS}

:host {
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid #bbb;
  border-radius: 0;
  box-shadow: 0 2px 3px rgba(0,0,0,.1);
  margin: 0 10px 10px;
  max-height: 355px;
  overflow-x: hidden;
  overflow-y: auto;
}

h1,
h2,
h3,
h4 {
  margin: 0;
  font-weight: 500;
}

p {
  margin: 5px 0;
}

h1 {
  font-size: 19px;
}

.warning {
  color: #cc1010;
}

.notice {
  padding: 10px;
}

.notice > :last-child {
  margin-bottom: 0;
}

.label {
  margin-left: 5px;
  font-variant-numeric: tabular-nums;
  font-weight: 500;
  background: rgba(0,0,0,.08);
  padding: 2px 4px;
  border-radius: 3px;
  color: #444;
  font-size: 10px;
}

hr {
  margin: 0;
  border: 0;
  border-top: 1px solid #ddd;
}

.site-info {
  padding: 12px 16px 10px;
  border-bottom: 1px solid #ccc;
}

.site-info .details {
  word-break: break-word;
}

.site-info .floating-right {
  float: right;
}

.site-info .floating-right button {
  padding: 5px;
}

.site-info .editable:hover {
  cursor: pointer;
  text-decoration: underline;
}

.site-info .desc .editable:before {
  top: 25px;
}
.site-info .desc .editable:after {
  top: 20px;
}

.nav {
  display: flex;
  align-items: center;
  padding: 8px 6px;
  border-bottom: 1px solid #ccc;
}

.nav .desc {
  display: flex;
  align-items: center;
}

.nav .tabs {
  display: flex;
}

.nav .tabs a {
  text-align: center; /* for when stacking occurs in narrow views */
  border-radius: 16px;
  font-size: 11px;
  padding: 6px 12px;
  cursor: pointer;
  margin-left: 2px;
}

.nav .tabs a.active {
  background: #f0f0f4;
}

.nav .tabs a:not(.active):hover {
  background: #f0f0f4;
}

.inner > div {
  display: block;
  padding: 10px;
  border-bottom: 1px solid #ccc;
}

.inner > .handlers {
  padding: 8px 10px;
}

.handler {
  display: flex;
  align-items: center;
  cursor: pointer;
  height: 30px;
}

.handler:hover {
  background: rgb(245, 245, 245);
}

.handler > * {
  margin-left: 5px;
}

.handler .favicon {
  width: 16px;
  height: 16px;
}

.handler .title {
  font-size: 14px;
  margin-left: 8px;
}
`
export default cssStr