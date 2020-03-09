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

a {
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

.drives {
  font-size: 13px;
  box-sizing: border-box;
}

.drives .empty {
  font-size: 17px;
  letter-spacing: 0.75px;
  color: #667;
  padding: 28px 40px;
}

:host(.top-border) .drive:first-child {
  border-top: 1px solid #dde;
}

.drive {
  position: relative;
  display: flex;
  align-items: center;
  padding: 18px 24px;
  color: #555;
  border-bottom: 1px solid #dde;
}

.drive a {
  color: #99a;
  font-weight: 600;
  cursor: pointer;
  letter-spacing: -0.5px;
}

.drive .thumb {
  display: block;
  width: 32x;
  height: 32px;
  margin-right: 20px;
}

.drive .thumb:hover {
  border-color: #99a;
}

.drive .info {
  flex: 5;
}

.drive .info .title {
  font-size: 15px;
  line-height: 1;
}

.drive .info .title a {
  font-weight: 500;
  letter-spacing: 0.5px;
  color: #333;
}

.drive .info .title .fa-fw {
  margin-right: 3px;
}

.drive .info .description {
  letter-spacing: -0.2px;
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

.drive .group {
  flex: 1;
  min-width: 160px;
}

.drive .group a {
  font-weight: normal;
  color: var(--blue);
  letter-spacing: 0;
}

.drive .forks {
  flex: 1;
  min-width: 100px;
}

.drive .peers {
  flex: 1;
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