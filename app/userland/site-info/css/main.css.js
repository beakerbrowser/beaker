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
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,.4);
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
  background: #fafafa;
  margin: 10px;
  padding: 10px;
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
  display: flex;
  align-items: flex-start;
  padding: 6px 10px;
  border-bottom: 1px solid #ccc;
}

.site-info .details {
  flex: 1;
  word-break: break-word;
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

.fork-of {
  color: gray;
}

.followers {
  color: gray;
}

.followers a {
  color: inherit;
  text-decoration: none;
}

.followers a:hover {
  text-decoration: underline;
}

.primary-actions {
  display: flex;
  align-items: center;
  padding: 5px 6px;
  border-bottom: 1px solid #ccc;
}

.primary-actions button {
  padding: 5px 6px;
  margin-right: 4px;
}

.nav {
  display: flex;
  align-items: center;
  padding: 5px 6px;
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
  background: #e5e5e5;
}

.nav .tabs a:not(.active):hover {
  background: rgb(245, 245, 245);
}

.inner > div {
  display: block;
  padding: 10px;
  border-bottom: 1px solid #ccc;
}
`
export default cssStr