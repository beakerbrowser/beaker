import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import buttonsCSS from 'beaker://app-stdlib/css/buttons2.css.js'
import inputsCSS from 'beaker://app-stdlib/css/inputs.css.js'
import tooltipCSS from 'beaker://app-stdlib/css/tooltip.css.js'
import famodCSS from 'beaker://app-stdlib/css/fa-mod.css.js'
import spinnerCSS from 'beaker://app-stdlib/css/com/spinner.css.js'

const cssStr = css`
${buttonsCSS}
${inputsCSS}
${tooltipCSS}
${famodCSS}
${spinnerCSS}

:host {
  --bg-color: #f1f1f6;
  --bg-color--light: #f8f8fc;
  --bg-color--dark: #e2e2ee;
}

a {
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

table {
  font-size: inherit;
  color: inherit;
}

.link {
  color: var(--blue);
}

.label {
  display: inline-block;
  background: var(--bg-color);
  border-radius: 4px;
  padding: 2px 5px;
  font-size: 10px;
  font-weight: 500;
}

.label.verified {
  color: #2196F3;
  background: #e6f1ff;
}

.menubar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 30px;
  padding: 0 10px;
  background: #fff;
  z-index: 3;
}

.layout {
  height: 100vh;
  overflow: auto;
}

main {
  margin: 0px 370px 0px 300px;
  position: relative;
}

.hide-nav-left main { margin-left: 16px; }
.hide-nav-right main { margin-right: 16px; }

.loading-view {
  background: var(--bg-color--light);
  padding: 40px;
  margin: 20px;
  border-radius: 8px;
  color: #667;
  font-size: 14px;
  opacity: 0;
  transition: opacity 1s;
}

.loading-view > div {
  display: flex;
  align-items: center;
}

.loading-view.visible {
  opacity: 1;
}

.loading-view .spinner {
  margin-right: 10px;
  color: #778;
}

.loading-notice {
  position: absolute;
  top: 40px;
  right: 0;
  z-index: 10;
  padding: 5px 10px;
  background: #fffa;
  border-radius: 4px;
  border: 1px solid #ddd;
  box-shadow: 0 1px 3px #0002;
}

.error-view {
  background: #fee;
  padding: 40px;
  margin: 20px;
  border-radius: 8px;
  color: #c55;
  font-size: 16px;
  line-height: 32px;
}

main .error-view {
  margin: 4px 0;
}

.error-view .error-title {
  font-size: 27px;
  line-height: 50px;
}

.error-view summary {
  font-weight: bold;
}

.error-view pre {
  background: #fffa;
  line-height: 1;
  padding: 10px;
  border-radius: 4px;
}

.nav-toggle {
  position: fixed;
  top: 0px;
  width: 20px;
  height: 100vh;
  padding: 50vh 2px 0;
  box-sizing: border-box;
  z-index: 3;
}
.nav-toggle:hover {
  cursor: pointer;
  background: rgba(0, 0, 0, .08);
}
.nav-toggle span { display: none; }
.nav-toggle:hover span { display: inline; }
.nav-toggle.left { left: 0; }
.nav-toggle.right { right: 0; text-align: right; }

nav {
  position: fixed;
  z-index: 2;
  top: 4px;
  width: 270px;
  height: 100vh;
  box-sizing: border-box;
  background: var(--bg-color);
  padding: 10px;
  overflow-y: auto;
}

nav.left {
  left: 0px;
}

nav.right {
  right: 0px;
  width: 360px;
  border-top-left-radius: 8px;
}

nav section h1,
nav section h2 {
  display: flex;
  align-items: center;
  margin: 0 0 10px;
}

nav section h1 {
  font-size: 1.5em;
}

nav section h2 {
  font-size: 1.35em;
}

nav section h3,
nav section h4,
nav section h5 {
  margin: 0;
}

nav h4 code {
  word-break: break-word;
}

nav img {
  display: inline-block;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  object-fit: cover;
  margin-right: 10px;
}

nav a {
  color: inherit;
}

nav p {
  margin: 10px 0;
}

nav code {
  word-break: break-all;
}

nav button {
  border-radius: 6px;
}

nav button .fa-caret-down {
  margin-left: 2px;
}

nav section {
  display: block;
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 10px;
  width: 100%;
  box-sizing: border-box;
  border: 0;
  box-shadow: none;
  font-size: 12px;
}

nav section section {
  border: 1px solid #dde;
  margin: 0;
}

nav section > :first-child {
  margin-top: 0;
}

nav section > :last-child {
  margin-bottom: 0;
}

nav section.transparent {
  background: transparent;
}

nav file-display {
  max-height: 360px;
  overflow: hidden;
}

nav selection-info[full-view] file-display {
  max-height: none;
}

nav section .bottom-ctrls {
  margin: 0 -8px -8px;
  border-top: 1px solid #eef;
  padding-top: 4px;
}

nav section .bottom-ctrls a.btn {
  display: inline-block;
  padding: 4px;
  text-decoration: none;
  margin: 0 6px;
  font-size: 11px;
  border-radius: 4px;
}

nav section .bottom-ctrls a.btn:hover {
  background: rgb(245, 245, 250);
}

nav .facts {
  line-height: 1.6;
}

nav .facts > span {
  display: inline-block;
  white-space: nowrap;
  margin-right: 5px;
}

nav .help {
 background: transparent;
 border: 1px solid #b7b7d0;
 color: #85859e;
}

nav .help table {
  width: 100%;
}

nav .help table tr:not(:last-child) td {
  padding-bottom: 5px;
}

nav .help table td:first-child {
  width: 18px;
  text-align: center;
}

nav .help table td:first-child span {
  margin-left: -6px;
}

nav .help input {
  height: 22px;
  width: 100%;
  border-radius: 10px;
  background: #e1e1e8;
  color: #778;
  border: 0;
  text-overflow: ellipsis;
}

.header {
  position: sticky;
  z-index: 2;
  top: 0px;
  display: flex;
  align-items: center;
  margin: 0px -4px;
  font-size: 12px;
  color: #556;
  background: #fff;
  padding: 5px 0 5px 5px;
  user-select: none;
  white-space: nowrap;
}

.header > *:not(:last-child) {
  margin-right: 5px;
}

.header .date {
  color: #99a;
}

.header .spacer {
  flex: 1;
}

.header button {
  padding: 4px 6px;
  font-size: 10px;
  white-space: nowrap;
}

.header button.labeled-btn {
  padding: 5px 10px 5px 12px;
  border-radius: 12px;
  font-size: 10px;
}

.header button.active {
  background: #eef;
}

.header .drag-hover,
.header .drop-target {
  background: #f5f5ff !important;
  outline: rgb(191, 191, 243) dashed 1px;
}

.header .drag-hover * {
  pointer-events: none;
}

.header path-ancestry {
  display: flex;
  flex-wrap: nowrap;
  overflow-x: auto;
  align-items: baseline;
}

.header path-ancestry::-webkit-scrollbar {
  display: none;
}

.header path-ancestry a {
}

.header path-ancestry .author {
  font-weight: 500;
  color: inherit;
}

.header path-ancestry .name {
  color: inherit;
}

.header path-ancestry .fa-angle-right {
  margin: 0 2px;
}

`
export default cssStr