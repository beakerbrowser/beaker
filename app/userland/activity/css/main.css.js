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

header {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  padding: 6px 9px;
  background: var(--bg-color--default);
  color: var(--text-color--light);
  border-bottom: 1px solid var(--border-color--light);
  font-size: 14px;
}

header a.close {
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  margin-right: 3px;
}

header a.close:hover {
  background: var(--bg-color--semi-light);
}

header .title {
  font-weight: 500;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

header .title a {
  color: inherit;
}

nav {
  display: flex;
  font-size: 12px;
  margin-bottom: 10px;
  border-top: 1px solid var(--border-color--light);
}

nav a {
  border-bottom: 1px solid var(--border-color--light);
  border-right: 1px solid var(--border-color--light);
  padding: 5px 10px;
}

nav a.current {
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

.activity-feed {
  padding: 0 15px;
}
`
export default cssStr