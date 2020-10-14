import {css} from '../../vendor/lit-element/lit-element.js'
import buttonsCSS from '../buttons2.css.js'
import tooltipCSS from '../tooltip.css.js'
import markdownCSS from '../markdown.css.js'

const cssStr = css`
${buttonsCSS}
${tooltipCSS}
${markdownCSS}

nav {
  display: flex;
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
  margin-bottom: 6px;
}

.placeholder {
  position: absolute;
  top: 15px;
  left: 13px;
  color: var(--text-color--pretty-light);
  z-index: 1;
  pointer-events: none;
}

.editor {
  height: 150px;
  position: relative;
}

.editor.hidden {
  display: none;
}

textarea.hidden {
  display: none;
}

.preview {
  font-size: 14px;
  background: var(--bg-color--default);
  color: var(--text-color--default);
  padding: 0px 14px 14px;
}
.preview > :first-child {
  margin-top: 0;
}
.preview > :last-child {
  margin-bottom: 0;
}

.tags {
  display: flex;
  align-items: center;
  background: var(--bg-color--default);
  border: 1px solid var(--border-color--light);
  border-radius: 4px;
  padding: 6px 12px;
  margin-bottom: 6px;
}

.tags .fas {
  margin-right: 6px;
  font-size: 12px;
  -webkit-text-stroke: 1px var(--text-color--default);
  color: transparent;
}

.tags input {
  flex: 1;
  border: 0;
  outline: 0;
}

.actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
