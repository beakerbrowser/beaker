import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import spinnerCSS from 'beaker://app-stdlib/css/com/spinner.css.js'

const cssStr = css`
${spinnerCSS}

:host {
  display: block;
}

.nav {
  display: flex;
  border-bottom: 1px solid var(--border-color--light);
  padding: 0 4px;
}

.nav a {
  padding: 6px 14px;
}

.nav a:hover {
  cursor: pointer;
  background: var(--bg-color--light);
}

.nav a.selected {
  background: var(--bg-color--selected);
  color: var(--bg-color--default);
}

.posts {
  padding: 5px 0;
}

.post {
  padding: 10px;
  font-size: 14px;
  letter-spacing: 0.5px;
  line-height: 1.4;
  cursor: pointer;
}

.post.read {
  color: var(--text-color--pretty-light);
}

.post > * {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.post:hover {
  background: var(--bg-color--semi-light);
}

.post.current {
  background: var(--bg-color--selected);
  color: var(--bg-color--default);
}

.post .title {
  font-weight: 500;
  font-size: 15px;
  lettter-spacing: 0px;
  line-height: normal;
}

.post .signals {
  padding: 2px 2px 0;
  font-size: 12px;
}

.post .signals > span {
  margin-right: 2px;
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