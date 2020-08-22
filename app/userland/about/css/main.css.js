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
  z-index: 20;
  background: var(--bg-color--default);
  border-bottom: 1px solid var(--border-color--light);
}

nav {
  display: flex;
  align-items: center;
  padding-left: 6px;
}

nav a.nav-item {
  padding: 4px 8px;
  margin-left: 6px;
  color: var(--text-color--light);
  border-bottom: 2px solid transparent;
  cursor: pointer;
}

nav a.nav-item:hover {
  border-bottom: 2px solid var(--border-color--light);
  text-decoration: none;
}

nav a.nav-item.active {
  color: var(--text-color--default);
  border-bottom: 2px solid var(--border-color--nav-highlighted);
}

.empty {
  color: var(--text-color--light);
  margin: 15px 5px 20px;
}

.empty .fas {
  color: var(--text-color--pretty-light);
  margin-right: 18px;
}

.feed {
  margin: 0 auto;
  padding: 10px 20px;
  max-width: 720px;
}

`
export default cssStr