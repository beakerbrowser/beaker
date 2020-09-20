import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import inputsCSS from 'beaker://app-stdlib/css/inputs.css.js'
import buttons2CSS from 'beaker://app-stdlib/css/buttons2.css.js'
import tooltipCSS from 'beaker://app-stdlib/css/tooltip.css.js'
import spinnerCSS from 'beaker://app-stdlib/css/com/spinner.css.js'

const cssStr = css`
${inputsCSS}
${buttons2CSS}
${tooltipCSS}
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

#hover-el {
  position: fixed;
  visibility: hidden;
  z-index: 1;
  transform: translateX(-50%);
  background: var(--bg-color--semi-light);
  padding: 4px 8px;
  font-size: 12px;
}

.drive {
}

.drive .path {
  font-size: 11px;
  font-weight: bold;
  padding: 6px 10px;
  background: var(--bg-color--default);
  border-bottom: 1px solid var(--border-color--light);
}

section {
  background: var(--bg-color--default);
  padding: 10px;
  border-bottom: 1px solid var(--border-color--light);
}

section .label {
  color: var(--text-color--light);
  font-weight: 500;
  font-size: 11px;
  margin-bottom: 5px;
  text-transform: uppercase;
}

.blocks-grid {
  margin-top: 2px;
}

.blocks-grid .block {
  display: inline-block;
  background: var(--bg-color--semi-light);
  width: 1px;
  height: 10px;
}

.blocks-grid .block.downloaded {
  background: #2196F3;
}

.blocks-grid .block.hover {
  background: var(--text-color--link);
}

.log .entries {
  max-height: 100px;
  overflow: auto;
  background: var(--bg-color--light);
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-family: monospace;
}

.files {
  padding: 6px 10px;
  font-size: 11px;
  font-variant: tabular-nums;
}

.files .file .indicator {
  display: inline-block;
  margin-right: 5px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--bg-color--semi-light);
}

.files .file a {
  color: var(--text-color--pretty-light);
}

.files .file.downloaded .indicator {
  background: #2196F3;
}

.files .file.downloaded a {
  color: var(--text-color--default);
}
`
export default cssStr