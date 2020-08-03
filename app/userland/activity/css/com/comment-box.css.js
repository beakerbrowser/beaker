import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import inputsCSS from 'beaker://app-stdlib/css/inputs.css.js'
import buttons2CSS from 'beaker://app-stdlib/css/buttons2.css.js'
import spinnerCSS from 'beaker://app-stdlib/css/com/spinner.css.js'

const cssStr = css`
${inputsCSS}
${buttons2CSS}
${spinnerCSS}

:host {
  display: grid;
  grid-template-columns: 30px 1fr;
  margin: 10px 0;
}

a {
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

.thumb {
  display: block;
  width: 16px;
  height: 16px;
  object-fit: cover;
  border-radius: 50%;
  position: relative;
  top: 8px;
}

.container {
  position: relative;
  border: 1px solid var(--border-color--light);
  border-radius: 4px;
}

.container:before {
  content: '';
  display: block;
  position: absolute;
  top: 12px;
  left: -5px;
  width: 8px;
  height: 8px;
  z-index: 1;
  background: var(--bg-color--light);
  border-top: 1px solid var(--border-color--light);
  border-left: 1px solid var(--border-color--light);
  transform: rotate(-45deg);
}

nav {
  display: flex;
  font-size: 12px;
  padding: 6px 0 0;
  background: var(--bg-color--light);
  border-top-left-radius: 3px;
  border-top-right-radius: 3px;
}

nav a {
  border: 1px solid transparent;
  border-bottom: 1px solid var(--border-color--light);
  padding: 5px 14px;
}

nav a.current {
  background: var(--bg-color--default);
  border: 1px solid var(--border-color--light);
  border-bottom: 1px solid transparent;
  border-top-left-radius: 2px;
  border-top-right-radius: 2px;
}

nav a:hover {
  text-decoration: none;
  cursor: pointer;
  background: var(--bg-color--light);
}

nav span {
  min-width: 10px;
  background: var(--bg-color--light);
  border-bottom: 1px solid var(--border-color--light);
}

nav span:last-child {
  flex: 1;
}

.content {
  padding: 10px;
}

textarea {
  box-sizing: border-box;
  font-family: system-ui;
  width: 100%;
  min-height: 100px;
  resize: vertical;
}

.preview > :first-child {
  margin-top: 10px;
}

.preview > :last-child {
  margin-bottom: 10px;
}

.preview { font-size: 14px; }
.preview h1 { font-family: arial; font-size: 21px; font-weight: 600; padding-bottom: 5px; border-bottom: 1px solid var(--border-color--semi-light); }
.preview h2 { font-family: arial; font-size: 19px; font-weight: 600; padding-bottom: 4px; border-bottom: 1px solid var(--border-color--semi-light); }
.preview h3 { font-family: arial; font-size: 19px; font-weight: 500; }
.preview h4 { font-family: arial; font-size: 16px; font-weight: 600; }
.preview h5 { font-family: arial; font-size: 16px; font-weight: 500; }

.actions {
  text-align: right;
  padding: 0 10px 10px;
}

.actions button {
  font-size: 11px;
}
`
export default cssStr