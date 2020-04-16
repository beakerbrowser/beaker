import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import buttonsCSS from 'beaker://app-stdlib/css/buttons2.css.js'
import inputsCSS from 'beaker://app-stdlib/css/inputs.css.js'
import tooltipCSS from 'beaker://app-stdlib/css/tooltip.css.js'
import spinnerCSS from 'beaker://app-stdlib/css/com/spinner.css.js'

const cssStr = css`
${buttonsCSS}
${inputsCSS}
${tooltipCSS}
${spinnerCSS}

:host {
  display: block;
}

a {
  text-decoration: none;
  cursor: initial;
}

a[href]:hover {
  text-decoration: underline;
  cursor: pointer;
}

.drives {
  font-size: 13px;
  box-sizing: border-box;
  user-select: none;
}

.drives .empty {
  font-size: 16px;
  letter-spacing: 0.7px;
  color: #a3a3a8;
  padding: 120px 0px;
  background: #fafafd;
  text-align: center;
}

.drives .empty .fas {
  font-size: 120px;
  margin-bottom: 10px;
  color: #d3d3d8;
}

:host(.top-border) .drive:first-child {
  border-top: 1px solid #dde;
}

.drive {
  position: relative;
  display: flex;
  align-items: center;
  padding: 12px 20px;
  color: #555;
  border-bottom: 1px solid #dde;
}

.drive:hover {
  text-decoration: none !important;
  background: #fafafd;
}

.drive > * {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.drive a {
  color: #99a;
  font-weight: 500;
  letter-spacing: -0.5px;
}

.drive .favicon {
  display: block;
  width: 16px;
  height: 16px;
  object-fit: cover;
  margin-right: 20px;
}

.drive .title {
  font-weight: 500;
  margin-right: 20px;
}

:host(.full-size) .drive .title {
  flex: 1;
  font-size: 14px;
  margin-right: 0px;
}

.drive .title a {
  color: #555;
  letter-spacing: 0;
}

.drive .description {
  flex: 1;
  color: #99a;
  overflow: hidden;
}

:host(.full-size) .drive .description {
  flex: 2;
}

.drive .readonly {
  display: inline-block;
  background: #f3f3f7;
  color: #667;
  font-size: 11px;
  font-weight: 500;
  padding: 0 4px 2px;
  border-radius: 2px;
}

.drive .forks {
  flex: 0 0 100px;
}

.drive .peers {
  flex: 0 0 100px;
  min-width: 90px;
}

.drive .ctrls {
  width: 40px;
}

.drive .fa-share-alt {
  position: relative;
  top: -1px;
  font-size: 9px;
}

.drive .fa-code-branch {
  position: relative;
  top: -1px;
  font-size: 10px;
}

.drive .type {
  letter-spacing: -0.2px;
  color: green;
  overflow: visible;
}

.forks-container {
  position: relative;
  border-left: 40px solid #f3f3f8;
}

.fork-label {
  display: inline-block;
  padding: 1px 5px;
  background: #4CAF50;
  color: #fff;
  text-shadow: 0 1px 0px #0004;
  border-radius: 4px;
  font-size: 10px;
}

`
export default cssStr