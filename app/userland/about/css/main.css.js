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

header {
  position: sticky;
  top: 0;
  z-index: 20;
  background: var(--bg-color--default);
  border-bottom: 1px solid var(--border-color--light);
}

.nav {
  display: flex;
  padding: 0 8px 10px;
}

.nav .nav-item {
  display: block;
  margin-right: 5px;
  padding: 0 6px;
}

.nav .fa-fw {
  display: inline-block;
  margin-right: 4px;
  font-size: 11px;
  width: 26px;
  height: 26px;
  line-height: 26px;
  border-radius: 50%;
  color: var(--text-color--default);
  background: var(--bg-color--semi-light);
}

.nav .nav-item.current,
.nav .nav-item:hover {
  text-decoration: none;
}

.nav .nav-item.current .fa-fw {
  color: #fff;
  background: var(--text-color--markdown-link);
}

.nav.private .nav-item.current .fa-fw {
  background: var(--text-color--private-link);
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