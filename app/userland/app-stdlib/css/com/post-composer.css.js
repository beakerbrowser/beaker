import {css} from '../../vendor/lit-element/lit-element.js'
import inputsCSS from '../inputs.css.js'
import buttonsCSS from '../buttons2.css.js'
import tooltipCSS from '../tooltip.css.js'
import markdownCSS from '../markdown.css.js'

const cssStr = css`
${inputsCSS}
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
}

nav a:hover:not(.current) {
  text-decoration: none;
  cursor: pointer;
  background: var(--bg-color--light);
}

.view {
  margin-bottom: 6px;
}

label {
  font-size: 11px;
}

textarea {
  width: 100%;
  box-sizing: border-box;
  min-height: 100px;
  max-height: 50vh;
  resize: vertical;
  font-family: system-ui;
  font-size: 14px;
  padding: 14px;
  border-color: var(--border-color--light);
  border-top-left-radius: 0;
}

textarea:focus {
  box-shadow: none;
  border-color: var(--border-color--light);
}

textarea::placeholder {
  font-family: system-ui;
  font-size: 14px;
}

.preview {
  font-size: 14px;
  border: 1px solid var(--border-color--light);
  border-radius: 4px;
  padding: 14px;
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
}

.actions input[type="file"] {
  display: none;
}

.actions .ctrls :-webkit-any(.far, .fas) {
  font-size: 16px;
  color: var(--text-color--light);
}

.markdown :-webkit-any(h1, h2, h3, h4, h5) {
  font-family: arial;
  color: var(--text-color--light);
}
.markdown h1 { font-size: 21px; font-weight: 600; padding-bottom: 5px; border-bottom: 1px solid var(--border-color--semi-light); }
.markdown h2 { font-size: 19px; font-weight: 600; padding-bottom: 4px; border-bottom: 1px solid var(--border-color--semi-light); }
.markdown h3 { font-size: 19px; font-weight: 500; }
.markdown h4 { font-size: 16px; font-weight: 600; }
.markdown h5 { font-size: 16px; font-weight: 500; }
.markdown pre { font-size: 13px; }
.markdown :-webkit-any(video, audio, img) { max-width: 100%; }
.markdown a { color: var(--text-color--link); }
.markdown hr { border: 0; border-bottom: 1px solid var(--border-color--semi-light); }
`
export default cssStr
