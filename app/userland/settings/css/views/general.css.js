import {css} from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import colorsCSS from '../../../app-stdlib/css/colors.css.js'
import buttonsCSS from '../../../app-stdlib/css/buttons2.css.js'
import tooltipCSS from '../../../app-stdlib/css/tooltip.css.js'
import spinnerCSS from '../../../app-stdlib/css/com/spinner.css.js'

const cssStr = css`
${colorsCSS}
${buttonsCSS}
${tooltipCSS}
${spinnerCSS}

:host {
  display: block;
  max-width: 600px;
}

a {
  color: var(--blue);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

.section {
  margin-bottom: 30px;
}

.section.warning {
  color: red;
  background: #ffdddd;
  border: 1px solid transparent;
  padding: 0 10px;
  border-radius: 4px;
  margin: 10px 0;
}

.section.warning button {
  color: rgb(255, 255, 255);
  background: rgb(255, 59, 48);
  border: 0;
}

.section.warning button .spinner {
  border-color: #fff !important;
  border-right-color: transparent !important;
}

.form-group {
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 10px 12px;
  margin-bottom: 16px;
}

.form-group .section {
  margin-bottom: 0;
  padding: 0 10px 4px;
}

.form-group .section:not(:last-child) {
  margin-bottom: 0;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}

.form-group .section > :first-child {
  margin-top: 16px;
}

.form-group h2 {
  margin: 0;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-color);
}

.message {
  margin: 1em 0;
  background: var(--bg-color--message);
  padding: 10px;
  border-radius: 2px;
}

.message > :first-child {
  margin-top: 0;
}

.message > :last-child {
  margin-bottom: 0;
}

input[type="text"], input[type="url"] {
  height: 24px;
  padding: 0 7px;
  border-radius: 4px;
  color: rgba(51, 51, 51, 0.95);
  border: 1px solid #d9d9d9;
  box-shadow: inset 0 1px 2px #0001;
}

input[type="text"]:focus, input[type="url"]:focus {
  outline: 0;
  border: 1px solid rgba(41, 95, 203, 0.8);
  box-shadow: 0 0 0 2px rgba(41, 95, 203, 0.2);
}

input[type="radio"] {
  margin: 1px 7px 0 1px;
}

input[type="checkbox"] {
  margin: 1px 7px 0 1px;
}

.radio-item {
  display: flex;
  align-items: center;
}

.radio-item + .radio-item {
  margin-top: 4px;
}

.versions {
  font-size: 13px;
  background: var(--bg-color--message);
  margin-top: -10px;
  padding: 12px 35px;
  border-radius: 4px;
  line-height: 1.4;
}

.versions ul {
  padding-inline-start: 15px;
}

.versions strong {
  font-weight: 600;
}

.version-info .spinner {
  position: relative;
  top: 4px;
  margin: 0 4px 0 6px;
}

.search-settings-list {
  margin-bottom: 10px;
}

.search-settings-list a {
  color: gray;
  cursor: pointer;
}

`
export default cssStr
