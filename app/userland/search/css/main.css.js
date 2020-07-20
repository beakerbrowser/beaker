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
  --link-color: #06183a;
  --button-color: #333;
  --loading-color: #667;
  --spinner-color: #778;
  --error-bg: #fee;
  --error-pre-bg: #fffa;
  --error-color: #c55;
  --header-color: #556;
  --header-date-color: #99a;

  --primary-bg: #fff;
  --empty-bg: #f8f8fc;
  --empty-color: #667;

  --nav-bg: #f1f1f6;
  --nav-section-bg: #fff;
  --nav-border-color: #b7b7d0;
  --nav-hr-color: #eef;
  --nav-help-color: #85859e;
  --nav-help-input-bg: #e1e1e8;
  --nav-help-input-color: #778;
  --nav-kv-input-bg: #fff;
  --nav-kv-input-color: rgba(51, 51, 51, 0.95);
  --nav-kv-input-placeholder-color: gray;
  --nav-categories--link-current: #fff;
  --nav-categories--link-hover: #fafafd;

  --base-files-view--h4-border-color: #e3e3ee;
  --base-files-view--h4-color: #b0b0bc;
  --base-files-view--color-text: #557;

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
  --inline-file-list--color-itemauthor: #557;

  --file-grid--color-drive: #ccd;
  --file-grid--color-folder: #9ec2e0;
  --file-grid--color-file: #bbbbcc;
  --file-grid--color-goto: #bbbbce;
  --file-grid--color-itemname: #484444;
  --file-grid--color-itemdrive: #99a;
  --file-grid--color-viewfile: #ffffff;
  --file-grid--color-viewfile-outline: #a7a7ad;
  --inline-file-grid--color-itemauthor: #557;
}

.layout {
  height: 100vh;
  overflow: auto;
  background: var(--primary-bg);
  color: var(--primary-color);
}

@media (prefers-color-scheme: dark) {
  .layout {  
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

    --nav-bg: #334;
    --nav-section-bg: #223;
    --nav-border-color: #556;
    --nav-hr-color: #445;
    --nav-help-color: #889;
    --nav-help-input-bg: #556;
    --nav-help-input-color: #ccd;
    --nav-kv-input-bg: #223;
    --nav-kv-input-color: #eef;
    --nav-kv-input-placeholder-color: #889;
    --nav-categories--link-current: #223;
    --nav-categories--link-hover: #223;

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

table {
  font-size: inherit;
  color: inherit;
}

.link {
  color: var(--link-color);
}

main {
  position: relative;
  padding: 0 10px;
}

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
  top: 0px;
  right: 20px;
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

main {
  margin: 0px 0 0px 180px;
  position: relative;
}

nav {
  position: fixed;
  z-index: 2;
  left: 0px;
  top: 50px;
  width: 180px;
  height: 100vh;
  padding: 6px 6px 6px 8px;
  border-top-right-radius: 5px;
  box-sizing: border-box;
  background: var(--nav-bg);
  padding: 6px 8px;
  overflow-y: auto;
}

nav section.categories {
}

nav section.categories h5 {
  margin: 16px 10px 4px;
  font-size: 11px;
}

nav section.categories a {
  display: block;
  padding: 6px 10px;
  margin-bottom: 4px;
  border-radius: 4px;
  color: inherit;
}

nav section.categories span {
  display: block;
  padding: 8px 10px;
}

nav section.categories a.current {
  background: var(--nav-categories--link-current);
  font-weight: 500;
}

nav section.categories a:hover {
  background: var(--nav-categories--link-hover);
  text-decoration: none;
}

.header {
  position: sticky;
  z-index: 2;
  top: 0px;
  display: flex;
  align-items: center;
  font-size: 12px;
  color: var(--header-color);
  background-color: var(--primary-bg);
  padding: 8px 10px 10px;
  user-select: none;
  white-space: nowrap;
}

.header > *:not(:last-child) {
  margin-right: 5px;
}

.header .search {
  position: relative;
  flex: 1;
}

.header .search .fa-search {
  position: absolute;
  z-index: 2;
  top: 10px;
  left: 15px;
  font-size: 13px;
}

.header .search input {
  width: 100%;
  box-sizing: border-box;
  padding: 0 14px 0 34px;
  border-radius: 16px;
  font-size: 15px;
  height: 32px;
  line-height: 33px;
  letter-spacing: 0.5px;
}

.header .search input::placeholder {
  font-size: 15px;
}

.header button {
  padding: 4px 6px;
  font-size: 12px;
  letter-spacing: .5px;
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

`
export default cssStr