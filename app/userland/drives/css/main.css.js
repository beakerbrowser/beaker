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
  display: flex;
  padding-left: 204px;
  min-height: 100vh;
  background: #fafafd;
}

a {
  color: var(--blue);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

nav {
  position: fixed;
  top: 0;
  left: 4px;
  height: 100vh;
  width: 200px;
  border-right: 1px solid #dde;
}

main {
  flex: 1;
  max-width: 800px;
  background: #fff;
}

section {
}

nav .top-ctrl {
  display: flex;
  padding-top: 5px;
  padding-right: 5px;
}

nav .top-ctrl input {
  flex: 1;
  margin-right: 5px;
  height: 24px;
}

nav .categories {
  margin: 5px 0;
}

nav .categories a {
  display: block;
  padding: 14px 16px;
  color: #556;
  user-select: none;
  border-top: 1px solid transparent;
  border-left: 1px solid transparent;
  border-bottom: 1px solid transparent;
  cursor: pointer;
}

nav .categories a:hover {
  background: #fafafd;
  text-decoration: none;
}

nav .categories a.selected {
  position: relative;
  color: #333;
  background: #fff;
  font-weight: bold;
  border-top: 1px solid #dde;
  border-left: 1px solid #dde;
  border-bottom: 1px solid #dde;
}

nav .categories a.selected:after {
  content: '';
  position: absolute;
  top: 0;
  height: 100%;
  right: -1px;
  width: 2px;
  background: #fff;
}

nav .categories hr {
  margin: 4px 4px;
  border: 0;
  border-top: 1px solid #dde;
}

.drives {
  font-size: 13px;
  padding-top: 6px;
  min-height: 100vh;
  box-sizing: border-box;
  border-right: 1px solid #dde;
}

.drives .empty {
  font-size: 17px;
  letter-spacing: 0.75px;
  color: #667;
  padding: 28px 40px;
}

.drive {
  padding: 18px 24px;
  border-bottom: 1px solid #eef;
}

.drive .ctrls {
  float: right;
}

.drive .title {
  font-size: 18px;
  font-weight: bold;
  padding: 4px;
}

.drive .title a {
  color: inherit;
}

.drive .title .fa-fw {
  margin-right: 3px;
}

.drive .details {
  display: flex;
  margin-left: 29px;
}

.drive .details > * {
  padding: 4px 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.drive .type {
  letter-spacing: -0.2px;
  color: green;
}

.drive .description {
  letter-spacing: -0.2px;
  color: #777;
}

.drive .network {
  color: #777;
  letter-spacing: -0.2px;
}

.drive .fa-circle {
  animation: glow 2s infinite;
  margin-right: 2px;
}

@keyframes glow {
  0%    { color: #5bf; text-shadow: 0 0 2px #09f; }
  50%  { color: #09f; text-shadow: 0 0 0px #09f; }
  100%  { color: #5bf; text-shadow: 0 0 2px #09f; }
}

.help {
  max-width: 350px;
  line-height: 1.4;
  margin: 24px;
  background: #fafafd;
  border-radius: 8px;
  letter-spacing: 0.2px;
  color: #778;
}

.help > :first-child {
  margin-top: 0;
}

.help > :last-child {
  margin-bottom: 0;
}

.help kbd {
  background: #223;
  color: #fff;
  font-family: var(--code-font);
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 0.7rem;
}

`
export default cssStr