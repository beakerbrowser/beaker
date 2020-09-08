import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import spinnerCSS from 'beaker://app-stdlib/css/com/spinner.css.js'

const cssStr = css`
${spinnerCSS}

:host {
  display: block;
}

.heading {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--bg-color--light);
  font-weight: bold;
  font-size: 12px;
  padding: 10px;
  border-bottom: 1px solid var(--border-color--semi-light);
}

.heading a {
  color: var(--text-color--link);
  text-decoration: none;
  font-weight: normal;
}

.heading a:hover {
  cursor: pointer;
  text-decoration: underline;
}

.heading a.current {
  color: var(--text-color--default);
  font-weight: bold;
}

.loading {
  padding: 10px;
}

beaker-record {
  display: block;
  border-bottom: 1px solid var(--border-color--semi-light);
}

beaker-record.unread {
  background: var(--bg-color--unread);
}
`
export default cssStr