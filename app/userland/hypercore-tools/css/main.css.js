import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import inputsCSS from 'beaker://app-stdlib/css/inputs.css.js'
import buttons2CSS from 'beaker://app-stdlib/css/buttons2.css.js'
import tooltipCSS from 'beaker://app-stdlib/css/tooltip.css.js'
import spinnerCSS from 'beaker://app-stdlib/css/com/spinner.css.js'

const cssStr = css`
${inputsCSS}
${buttons2CSS}
${tooltipCSS}
${spinnerCSS}

:host {
  display: block;
}

a {
  text-decoration: none;
}

a[href]:hover {
  text-decoration: underline;
}

#hover-el {
  position: fixed;
  visibility: hidden;
  z-index: 1;
  transform: translateX(-50%);
  background: var(--bg-color--semi-light);
  padding: 4px 8px;
  font-size: 12px;
}

nav {
  display: flex;
  background: var(--bg-color--semi-light);
  border-bottom: 1px solid var(--border-color--default);
  padding: 0 6px;
}

nav a {
  padding: 4px 8px;
  font-size: 11px;
  cursor: pointer;
}

nav a:hover {
  background: #0001;
}

nav a.current {
  border-bottom: 1px solid var(--text-color--link);
}

.drives-list-header,
.drives-list-item {
  display: flex;
  align-items: center;
  font-size: 12px;
}

.drives-list-header {
  border-bottom: 1px solid var(--border-color--light);
  background: var(--bg-color--light);
}

.drives-list-item:nth-child(odd) {
  background: var(--bg-color--light);
}

.drives-list-item:last-child {
  border-bottom: 1px solid var(--border-color--semi-light);
}

.drives-list-item:hover {
  cursor: pointer;
  background: var(--bg-color--light-highlight);
}

.drives-list-item.selected {
  background: var(--bg-color--selected);
  color: var(--bg-color--default);
}

.drives-list-header > *,
.drives-list-item > * {
  border-left: 1px solid var(--border-color--semi-light);
  padding: 3px 8px;
  box-sizing: border-box;
  font-variant: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.drives-list-header > *:first-child,
.drives-list-item > *:first-child {
  border-left: 0;
}

.drives-list-header nav {
  padding: 0 4px;
  background: transparent;
}

.drives-list .key {
  flex: 0 0 150px;
}

.drives-list .type {
  flex: 0 0 50px;
}

.drives-list .initiator {
  flex: 0 0 180px;
}

.drives-list .peers {
  flex: 0 0 50px;
}

.drives-list-header > *:last-child,
.drives-list-item > *:last-child {
  flex: 1;
}

.drives-list-columns {
  display: flex;
}

.drives-list-columns .list {
  flex: 0 0 150px
}

.drives-list-columns .view {
  flex: 1;
  border-left: 1px solid var(--border-color--semi-light);
  height: calc(100vh - 47px);
  overflow: auto;
}

.drive {
}

.drive .path {
  font-size: 11px;
  font-weight: bold;
  padding: 6px 10px;
  background: var(--bg-color--default);
  border-bottom: 1px solid var(--border-color--light);
}

section {
  background: var(--bg-color--default);
  padding: 10px;
  border-bottom: 1px solid var(--border-color--light);
}

section .label {
  color: var(--text-color--light);
  font-weight: 500;
  font-size: 11px;
  margin-bottom: 5px;
  text-transform: uppercase;
}

section .key,
section .stats {
  font-size: 12px;
}

section .discovery-key-icon {
  font-size: 11px;
  color: var(--text-color--very-light);
}

section .discovery-key {
  width: 200px;
  word-break: break-all;
}

section .blocks-grid {
  margin-top: 2px;
}

section .blocks-grid .block {
  display: inline-block;
  background: var(--bg-color--semi-light);
  width: 1px;
  height: 10px;
}

section .blocks-grid .block.downloaded {
  background: var(--bg-color--selected);
}

section .blocks-grid .block.hover {
  background: var(--bg-color--default);
}

section.log .entries {
  max-height: 100px;
  overflow: auto;
  background: var(--bg-color--light);
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-family: monospace;
}

section.files {
  padding: 6px 10px;
  font-size: 11px;
  font-variant: tabular-nums;
}

section.files .file .indicator {
  display: inline-block;
  margin-right: 5px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--bg-color--semi-light);
}

section.files .file a {
  color: var(--text-color--pretty-light);
}

section.files .file.downloaded .indicator {
  background: #2196F3;
}

section.files .file.downloaded a {
  color: var(--text-color--default);
}
`
export default cssStr