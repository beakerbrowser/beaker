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
  display: grid;
  justify-content: center;
  grid-template-columns: auto auto;
  gap: 12px;
  background: var(--bg-color--default);
  font-size: 12px;
  padding: 10px;
  border-bottom: 1px solid var(--border-color--light);
  text-align: center;
}

nav a.nav-item {
  display: inline-block;
  padding: 2px 10px;
  color: var(--text-color--default);
  background: var(--bg-color--light);
  border: 1px solid var(--border-color--light);
  border-radius: 4px;
  cursor: pointer;
  width: 100px;
}

nav a.nav-item:hover {
  background: var(--bg-color--semi-light);
  text-decoration: none;
}

nav a.nav-item.active {
  background: var(--bg-color--nav-highlighted);
  color: var(--text-color--nav-highlighted);
  border-color: var(--border-color--nav-highlighted);
}

.empty {
  color: var(--text-color--light);
  margin: 15px 5px 20px;
}

.empty .fas {
  color: var(--text-color--pretty-light);
  margin-right: 18px;
}

.activity-feed {
  padding: 0 15px;
  max-width: 630px;
  margin: 0 auto;
}

`
export default cssStr