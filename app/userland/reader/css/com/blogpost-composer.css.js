import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import buttonsCSS from 'beaker://app-stdlib/css/buttons2.css.js'
import inputsCSS from 'beaker://app-stdlib/css/inputs.css.js'
import tooltipCSS from 'beaker://app-stdlib/css/tooltip.css.js'
import markdownCSS from 'beaker://app-stdlib/css/markdown.css.js'

const cssStr = css`
${buttonsCSS}
${inputsCSS}
${tooltipCSS}
${markdownCSS}

:host {
  display: block;
  padding: 10px;
  max-width: 100ch;
}

input.title {
  width: 100%;
  box-sizing: border-box;
  font-size: 19px;
  padding: 10px 10px;
  margin-bottom: 20px;
  border: 1px solid var(--border-color--light);
  border-radius: 4px;
}

nav {
  display: flex;
  font-size: 14px;
  border-top-left-radius: 3px;
  border-top-right-radius: 3px;
}

nav a {
  border: 1px solid transparent;
  padding: 5px 14px;
}

nav a.current {
  position: relative;
  background: var(--bg-color--default);
  border: 1px solid var(--border-color--light);
  border-bottom: 1px solid transparent;
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
}

nav a.current:after {
  content: '';
  background: var(--bg-color--default);
  position: absolute;
  left: 0;
  right: 0;
  bottom: -2px;
  height: 2px;
  z-index: 1;
}

nav a:hover:not(.current) {
  text-decoration: none;
  cursor: pointer;
  background: var(--bg-color--light);
}

.view {
  position: relative;
  background: var(--bg-color--default);
  border: 1px solid var(--border-color--light);
  border-radius: 4px;
  border-top-left-radius: 0;
  padding: 14px 0 2px;
  margin-bottom: 10px;
}

.placeholder {
  position: absolute;
  top: 15px;
  left: 13px;
  color: var(--text-color--pretty-light);
  z-index: 1;
  pointer-events: none;
  font-size: 15px;
}

.editor {
  height: calc(100vh - 170px);
  position: relative;
}

.editor.hidden {
  display: none;
}

textarea.hidden {
  display: none;
}

.preview {
  font-size: 15px;
  background: var(--bg-color--default);
  color: var(--text-color--default);
  padding: 10px 24px 24px;
}
.preview > :first-child {
  margin-top: 0;
}
.preview > :last-child {
  margin-bottom: 0;
}

.actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.visibility {
  display: inline-block;
  background: var(--bg-color--semi-light);
  border-radius: 4px;
  padding: 5px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
}

.visibility.disabled {
  cursor: default;
}

input[type="file"] {
  display: none;
}
`
export default cssStr
