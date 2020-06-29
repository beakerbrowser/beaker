import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import buttonsCSS from 'beaker://app-stdlib/css/buttons2.css.js'
import tooltipCSS from 'beaker://app-stdlib/css/tooltip.css.js'
import spinnerCSS from 'beaker://app-stdlib/css/com/spinner.css.js'

const cssStr = css`
${buttonsCSS}
${tooltipCSS}
${spinnerCSS}

:host {
  display: block;
}

a {
  text-decoration: none;
}

.bookmarks {
  font-size: 13px;
  box-sizing: border-box;
  user-select: none;
}

.bookmarks .empty {
  font-size: 16px;
  letter-spacing: 0.7px;
  color: var(--text-color--light);
  padding: 120px 0px;
  background: var(--bg-color--light);
  text-align: center;
}

.bookmarks .empty .far {
  font-size: 120px;
  margin-bottom: 30px;
  color: var(--text-color--light);
}

.bookmark {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  color: var(--text-color--lightish);
  border-bottom: 1px solid var(--border-color--light);
}

:host(.top-border) .bookmark:first-child {
  border-top: 1px solid var(--border-color--light);
}

.bookmark:hover {
  text-decoration: none;
  background: var(--bg-color--light);
}

.bookmark > * {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bookmark .favicon {
  display: block;
  width: 16px;
  height: 16px;
  margin-right: 20px;
}

.bookmark .title {
  font-weight: 500;
  margin-right: 20px;
}

:host(.full-size) .bookmark .title {
  flex: 1;
  font-size: 14px;
  margin-right: 0px;
}

.bookmark .href {
  flex: 1;
  color: #99a;
}

:host(.full-size) .bookmark .href {
  flex: 2;
}

.bookmark .ctrls {
  width: 75px;
}

`
export default cssStr