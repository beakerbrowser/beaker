import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import inputsCSS from 'beaker://app-stdlib/css/inputs.css.js'
import buttons2CSS from 'beaker://app-stdlib/css/buttons2.css.js'
import spinnerCSS from 'beaker://app-stdlib/css/com/spinner.css.js'

const cssStr = css`
${inputsCSS}
${buttons2CSS}
${spinnerCSS}

:host {
  display: block;
}

a {
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

.container {
  margin-bottom: 10px;
}

textarea {
  box-sizing: border-box;
  width: 100%;
  min-height: 70px;
  resize: vertical;
}

.preview {
  padding: 10px 14px;
  background: var(--bg-color--light);
  margin-bottom: 10px;
}

.preview:before {
  content: 'Preview';
  font-weight: 500;
  color: var(--text-color--light);
  font-size: 11px;
}

.preview > :first-child {
  margin-top: 10px;
}

.preview > :last-child {
  margin-bottom: 10px;
}
`
export default cssStr