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
  display: grid;
  grid-template-columns: 200px 1fr;
  grid-gap: 8px;
  padding: 4px;
  min-height: 100vh;
}

a {
  color: var(--blue);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

nav .top-ctrl {
  display: flex;
}

nav .top-ctrl input {
  flex: 1;
  margin-right: 5px;
  height: 24px;
}

nav .categories {
  margin: 4px 0;
  border: 1px solid #dde;
  border-radius: 4px;
  overflow: hidden;
}

nav .categories a {
  display: block;
  padding: 8px;
  border-bottom: 1px solid #dde;
  color: inherit;
  user-select: none;
}

nav .categories a:last-child {
  border: 0;
}

nav .categories a:hover,
nav .categories a.selected {
  background: #fafafd;
  text-decoration: none;
}

nav .categories a.selected {
  font-weight: 500;
}

main {
}

.drives {
  font-size: 13px;
}

.drives .empty {
  user-select: none;
  background: #fafafd;
  font-size: 17px;
  letter-spacing: 0.25px;
  color: #667;
  padding: 40px;
}

.drive {
  padding: 20px 16px;
  border-top: 1px solid #dde;
  user-select: none;
  cursor: pointer;
}

.drive:last-child {
  border-bottom: 1px solid #dde;
}

.drive:hover {
  background: #fafafd;
}

.drive .title {
  font-size: 18px;
  font-weight: bold;
  padding: 4px;
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

.drive.selected {
  background: #4379e4;
}

.drive.selected .details > * {
  color: rgba(255, 255, 255, 0.9);
}

.drive.selected > .title {
  color: #fff;
}

.drag-selector {
  position: fixed;
  background: #5591ff33;
  border: 1px solid #77adffee;
  pointer-events: none;
  z-index: 2;
}
`
export default cssStr