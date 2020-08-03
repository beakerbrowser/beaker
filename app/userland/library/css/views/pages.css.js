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

.pages {
  font-size: 13px;
  box-sizing: border-box;
  user-select: none;
}

:host(:not(.full-size)) .pages {
  max-width: 1000px;
  margin: 0 auto;
}

.pages .empty {
  font-size: 16px;
  letter-spacing: 0.7px;
  color: var(--text-color--light);
  padding: 120px 0px;
  background: var(--bg-color--light);
  text-align: center;
}

.pages .empty .far {
  font-size: 120px;
  margin-bottom: 30px;
  color: var(--text-color--light);
}

.page {
  display: flex;
  align-items: center;
  padding: 6px 14px;
  color: var(--text-color--lightish);
  border-bottom: 1px solid var(--border-color--light);
}

:host(.top-border) .page:first-child {
  border-top: 1px solid var(--border-color--light);
}

.page:hover {
  text-decoration: none;
  background: var(--bg-color--light);
}

.page > * {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.page .favicon {
  display: block;
  width: 16px;
  height: 16px;
  margin-right: 12px;
}

.page .title {
  font-weight: 400;
  margin-right: 20px;
}

:host(.full-size) .page .title {
  flex: 1;
  font-size: 14px;
  margin-right: 0px;
}

.page .info {
  flex: 0 0 200px;
  color: #99a;
}

.page .ctrls {
  width: 40px;
}

@media (max-width: 700px) {
  .page .title {
    font-size: 13px !important;
  }
}

`
export default cssStr