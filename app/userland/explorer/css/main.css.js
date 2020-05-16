import {css} from '../vendor/lit-element/lit-element.js'
import buttonsCSS from './buttons2.css.js'
import inputsCSS from './inputs.css.js'
import tooltipCSS from './tooltip.css.js'
import famodCSS from './fa-mod.css.js'
import spinnerCSS from './com/spinner.css.js'

const cssStr = css`
${buttonsCSS}
${inputsCSS}
${tooltipCSS}
${famodCSS}
${spinnerCSS}

:host {
  --primary-color: #333;
  --link-color: var(--blue);
  --button-color: #333;
  --loading-color: #667;
  --spinner-color: #778;
  --error-bg: #fee;
  --error-pre-bg: #fffa;
  --error-color: #c55;
  --header-color: #556;
  --header-date-color: #99a;

  --primary-bg: #fff;
  --nav-bg: #f1f1f6;
  --label-bg: #f1f1f6;
  --empty-bg: #f8f8fc;
  --empty-color: #667;

  --base-files-view--h4-border-color: #e3e3ee;
  --base-files-view--h4-color: #b0b0bc;
  --base-files-view--drag-bg: #f5f5ff;

  --file-list--item-border-color: #fff5;
  --file-list--color-drive: #ccd;
  --file-list--color-folder: #9ec2e0;
  --file-list--color-file: #9a9aab;
  --file-list--color-goto: #9a9aab;
  --file-list--color-subicon: #556;
  --file-list--color-itemname: #333;
  --file-list--color-itemprop: #777;
  --file-list--color-viewfile: #ffffff;
  --file-list--color-viewfile-outline: #95959c;
  --file-list--color-subicon-selected: #fff;
  --file-list--color-itemname-selected: #fff;
  --file-list--color-itemprop-selected: rgba(255, 255, 255, 0.7);
  --file-list--color-selected-bg: #4379e4;
  --inline-file-list--color-selected-bg: #f3f3f8;
  --inline-file-list--color-iteminfo: #99a;
  --inline-file-list--color-itemprop: #556;
  --inline-file-list--color-border: #eee;

  --file-grid--color-drive: #ccd;
  --file-grid--color-folder: #9ec2e0;
  --file-grid--color-file: #bbbbcc;
  --file-grid--color-goto: #bbbbce;
  --file-grid--color-itemname: #484444;
  --file-grid--color-itemdrive: #99a;
  --file-grid--color-viewfile: #ffffff;
  --file-grid--color-viewfile-outline: #a7a7ad;
  --file-grid--color-selected-fg: #fff;
  --file-grid--color-selected-bg: #4379e4;
  --file-grid--color-selected-bg-icon: #dddde5;
  --inline-file-grid--color-selected-bg: #f3f3f8;
  --inline-file-grid--color-itemname: #556;
  --inline-file-grid--color-itemauthor: #99a;
}

.layout {
  height: 100vh;
  overflow: auto;
  background: var(--primary-bg);
  color: var(--primary-color);
}

.layout.attached-mode {  
  --primary-bg: #223;
  --primary-color: #eef;
  --header-color: #f5f5ff;
  --button-color: #eee;
  --empty-bg: #334;
  --loading-color: #dde;
  --empty-color: #dde;
  --error-bg: #ffeeee0d;
  --error-color: #ff1010;
  --error-pre-bg: rgba(0, 0, 0, 0.29);

  --base-files-view--h4-border-color: #6e6e80;
  --base-files-view--h4-color: #babac5;
  --base-files-view--drag-bg: #334;

  --file-list--item-border-color: #223;
  --file-list--color-drive: #ccd;
  --file-list--color-folder: #9ec2e0;
  --file-list--color-file: none;
  --file-list--color-goto: #fff;
  --file-list--color-subicon: #fff;
  --file-list--color-itemname: #f5f5ff;
  --file-list--color-itemprop: #dde;
  --file-list--color-viewfile: #ffffff;
  --file-list--color-viewfile-outline: none;
  --file-list--color-subicon-selected: #fff;
  --file-list--color-itemname-selected: #fff;
  --file-list--color-itemprop-selected: rgba(255, 255, 255, 0.7);
  --file-list--color-selected-bg: #4379e4;
  --inline-file-list--color-selected-bg: #445;
  --inline-file-list--color-iteminfo: #99a;
  --inline-file-list--color-itemprop: #f5f5ff;
  --inline-file-list--color-border: #333;

  --file-grid--color-drive: #ccd;
  --file-grid--color-folder: #9ec2e0;
  --file-grid--color-file: #bbbbcc;
  --file-grid--color-goto: #ccccde;
  --file-grid--color-itemname: #f5f5ff;
  --file-grid--color-itemdrive: #99a;
  --file-grid--color-viewfile: #ffffff;
  --file-grid--color-viewfile-outline: none;
  --file-grid--color-selected-fg: #fff;
  --file-grid--color-selected-bg: #4379e4;
  --file-grid--color-selected-bg-icon: #445;
  --inline-file-grid--color-selected-bg: #445;
  --inline-file-grid--color-itemname: #f5f5ff;
  --inline-file-grid--color-itemauthor: #99a;
}

.layout.attached-mode::-webkit-scrollbar {
  display: none;
}

a {
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

button {
  color: var(--button-color);
}

.layout.attached-mode button.transparent:hover,
.layout.attached-mode button.transparent.active {
  background: #fff3;
}

table {
  font-size: inherit;
  color: inherit;
}

.link {
  color: var(--link-color);
}

.label {
  display: inline-block;
  background: var(--label-bg);
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

main {
  margin: 0px 370px 0px 300px;
  position: relative;
}

.hide-nav-left main { margin-left: 16px; }
.hide-nav-right main { margin-right: 16px; }
.layout.attached-mode.hide-nav-left main { margin-left: 12px; }
.layout.attached-mode.hide-nav-right main { margin-right: 12px; }

.loading-view {
  background: var(--empty-bg);
  padding: 40px;
  margin: 20px;
  border-radius: 8px;
  color: var(--loading-color);
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
  color: var(--spinner-color);
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
  background: var(--error-bg);
  padding: 40px;
  margin: 20px;
  border-radius: 8px;
  color: var(--error-color);
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
  background: var(--error-pre-bg);
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
  background: var(--nav-bg);
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

nav .metadata {
  width: 100%;
  margin: 10px 0 0;
  border-bottom: 1px solid #ccd;
}

nav .metadata .entry {
  display: flex;
  border: 1px solid #ccd;
  border-bottom: 0;
}

nav .metadata input {
  box-sizing: border-box;
  border: 0;
  border-radius: 0;
}

nav .metadata input[name="key"] {
  border-right: 1px solid #ccd;
  flex: 0 0 120px;
}

nav .metadata input[name="value"] {
  flex: 1;
  box-sizing: border-box;
}

nav .metadata + button {
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  display: block;
  width: 100%;
}

.home {
  max-width: 600px;
  margin: 10px auto;
  text-align: center;
  letter-spacing: 0.5px;
}

.home h1 {
  font-size: 32px;
}

.home h3 {
  font-size: 21px;
  line-height: 1.2;
}

.home p {
  font-size: 16px;
  line-height: 1.4;
}

.home a {
  color: #2864dc;
}

.home section {
  border: 1px solid #ccd;
  border-radius: 4px;
  padding: 50px 20px 60px;
}

.home aside {
  background: #f5f5fa;
  border-radius: 4px;
  padding: 20px;
  margin: 20px 0;
}

.home aside button {
  display: block;
  margin: 0 auto;
  font-size: 21px;
}

.header {
  position: sticky;
  z-index: 2;
  top: 0px;
  display: flex;
  align-items: center;
  margin: 0px -4px;
  font-size: 12px;
  color: var(--header-color);
  background-color: var(--primary-bg);
  padding: 5px 0 5px 5px;
  user-select: none;
  white-space: nowrap;
}

.layout.attached-mode .header {
  padding-right: 45px; /* give room for the buttons */
}

.header > *:not(:last-child) {
  margin-right: 5px;
}

.header .date {
  color: var(--header-date-color);
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

.header button:not(.primary).active {
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