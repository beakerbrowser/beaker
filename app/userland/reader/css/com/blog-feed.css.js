import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import spinnerCSS from 'beaker://app-stdlib/css/com/spinner.css.js'

const cssStr = css`
${spinnerCSS}

:host {
  display: block;
}

.posts {
}

.post {
  padding: 6px 12px;
  font-size: 14px;
  letter-spacing: 0.5px;
  line-height: 1.4;
  cursor: pointer;
}

.post:nth-child(odd) {
  background: var(--bg-color--light);
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