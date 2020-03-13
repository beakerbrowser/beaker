import {css} from '../../app-stdlib/vendor/lit-element/lit-element.js'
import buttonsCSS from '../../app-stdlib/css/buttons2.css.js'
import inputsCSS from '../../app-stdlib/css/inputs.css.js'
import tooltipCSS from '../../app-stdlib/css/tooltip.css.js'
import spinnerCSS from '../../app-stdlib/css/com/spinner.css.js'
import formCSS from './form.css.js'

const cssStr = css`
${buttonsCSS}
${inputsCSS}
${tooltipCSS}
${formCSS}
${spinnerCSS}

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

.loading {
  display: flex;
  align-items: center;
  padding: 16px;
}

.loading .spinner {
  margin-right: 10px;
}

.site-info {
  padding: 12px 16px 10px;
  border-bottom: 1px solid #ccc;
}

.site-info .details {
  word-break: break-word;
}

.inner > div {
  display: block;
  padding: 10px;
  border-bottom: 1px solid #ccc;
}
`
export default cssStr