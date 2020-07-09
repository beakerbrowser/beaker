import {css} from '../../app-stdlib/vendor/lit-element/lit-element.js'
import commonCSS from '../../app-stdlib/css/common.css.js'
import buttonsCSS from '../../app-stdlib/css/buttons2.css.js'
import emptyCSS from './empty.css.js'

const cssStr = css`
${commonCSS}
${buttonsCSS}
${emptyCSS}

:host {
  display: block;
  margin: 10px 10px 10px 230px;
}

.subnav {
  position: fixed;
  left: 10px;
  top: 10px;
  width: 190px;
  height: calc(100vh - 20px);
  box-sizing: border-box;
  background: var(--bg-color--light);
  border-radius: 8px;
  padding: 10px 0;
  overflow-y: auto;
  font-size: 12px;
  user-select: none;
}

.subview {

}

.subnav .item {
  padding: 8px 15px;
  margin-bottom: 2px;
  color: var(--text-color--subnav-item);
  text-decoration: none;
  box-sizing: border-box;
  cursor: pointer;
}

.subnav .item .fa-fw {
  margin-right: 5px;
}

.subnav .item:hover {
  background: var(--bg-color--subnav-item--hover);
}

.subnav .item.current {
  background: var(--bg-color--subnav-item--current);
  font-weight: 600;
}

.subnav hr {
  border: 0;
  border-top: 1px solid var(--border-color--light);
  margin: 15px 0;
}
`
export default cssStr