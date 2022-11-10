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

:host(:not(.full-size)) .bookmarks {
  max-width: 1000px;
  margin: 0 auto;
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
  padding: 6px 14px;
  color: var(--text-color--light);
  border-bottom: 1px solid var(--border-color--light);
}

:host(.top-border) .bookmark:first-child {
  border-top: 1px solid var(--border-color--light);
}

.bookmark.private {
  background: var(--bg-color--private-light);
  color: var(--text-color--private-default);
  border-color: var(--border-color--private-light);
}

.bookmark:hover {
  text-decoration: none;
  background: var(--bg-color--light);
}

.bookmark.private:hover {
  background: var(--bg-color--private-semi-light);
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
  margin-right: 12px;
}

.bookmark .title {
  font-weight: 400;
  margin-right: 20px;
  flex: 1;
  font-size: 14px;
  margin-right: 0px;
  color: var(--text-color--default);
}

.bookmark.private .title {
}

.bookmark .href {
  flex: 1;
  color: inherit;
}

.bookmark .info {
  flex: 0 0 100px;
  color: inherit;
}

.bookmark .ctrls {
  width: 40px;
}

@media (max-width: 700px) {
  .bookmark {
    font-size: 12px;
  }
  .bookmark .favicon {
    width: 12px;
    height: 12px;
  }
  .bookmark .title {
    font-size: 12px;
  }
  .bookmark .info {
    flex: 0 0 50px;
  }
}

`
export default cssStr