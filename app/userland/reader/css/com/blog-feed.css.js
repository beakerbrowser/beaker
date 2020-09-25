import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import spinnerCSS from 'beaker://app-stdlib/css/com/spinner.css.js'

const cssStr = css`
${spinnerCSS}

:host {
  display: block;
}

.post {
  padding: 10px;
  border-bottom: 1px solid var(--border-color--light);
  font-size: 14px;
  color: var(--text-color--pretty-light);
  letter-spacing: 0.5px;
  line-height: 1.4;
  cursor: pointer;
}

.post > * {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.post:hover,
.post.current {
  background: var(--bg-color--semi-light);
}

.post .title {
  color: var(--text-color--default);
  font-weight: 500;
  font-size: 15px;
  lettter-spacing: 0px;
  line-height: normal;
}

.badge {
  display: inline-block;
  padding: 2px 4px;
  background: var(--bg-color--selected);
  color: var(--bg-color--default);
  font-weight: 500;
  border-radius: 2px;
  text-transform: uppercase;
  font-size: 9px;
}

`
export default cssStr