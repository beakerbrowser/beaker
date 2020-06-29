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

.contacts {
  font-size: 13px;
  box-sizing: border-box;
  user-select: none;
}

.empty {
  font-size: 16px;
  letter-spacing: 0.7px;
  color: var(--text-color--light);
  padding: 120px 0px;
  background: var(--bg-color--light);
  text-align: center;
}

.empty .far {
  font-size: 120px;
  margin-bottom: 30px;
  color: var(--text-color--light);
}

:host(.top-border) .contact:first-child {
  border-top: 1px solid var(--border-color--light);
}

.contact {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  color: var(--text-color--lightish);
  border-bottom: 1px solid var(--border-color--light);
}

.contact:hover {
  text-decoration: none;
  background: var(--bg-color--light);
}

.contact > * {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.contact .thumb {
  display: inline-block;
  width: 16px;
  height: 16px;
  object-fit: cover;
  border-radius: 50%;
  margin-right: 16px;
}

.contact .title {
  font-weight: 500;
  margin-right: 20px;
}

:host(.full-size) .contact .title {
  flex: 1;
  font-size: 14px;
  margin-right: 0px;
}

.contact .description {
  flex: 1;
  color: #99a;
  overflow: hidden;
}

:host(.full-size) .contact .description {
  flex: 2;
}

.contact .peers {
  flex: 0 0 100px;
  min-width: 90px;
  color: #99a;
  font-weight: 500;
  letter-spacing: -0.5px;
}

.profile-badge {
  width: 80px;
}

.profile-badge span {
  font-size: 10px;
  background: #f3f3f8;
  color: #778;
  padding: 2px 8px;
  border-radius: 8px;
}

`
export default cssStr