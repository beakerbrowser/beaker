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

#close-btn {
  position: fixed;
  z-index: 1;
  top: 3px;
  right: 8px;
  cursor: pointer;
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

.drives-list .key { flex: 0 0 150px; }
.drives-list .type { flex: 0 0 50px; }
.drives-list .initiator { flex: 0 0 180px; }
.drives-list .peers { flex: 0 0 50px; }

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

.drive .mount-path {
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
  padding: 0 10px 6px;
  font-size: 11px;
  font-variant: tabular-nums;
}

section.files .file-header,
section.files .file {
  display: flex;
  align-items: center;
}

section.files .file-header {
  position: sticky;
  top: 0;
  padding: 4px 0;
  background: var(--bg-color--default);
  color: var(--text-color--pretty-light);
}

section.files .indicator { flex: 0 0 6px; margin-right: 10px; }
section.files .path { flex: 1; }
section.files .size { flex: 0 0 120px; }
section.files .offset { flex: 0 0 50px; }
section.files .blocks { flex: 0 0 50px; }

section.files .file .indicator {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--bg-color--semi-light);
}

section.files .file a.path {
  color: var(--text-color--pretty-light);
}

section.files .file.downloaded .indicator {
  background: #2196F3;
}

section.files .file.downloaded a {
  color: var(--text-color--default);
}

.api-calls-grid.two {
  display: grid;
  grid-template-rows: auto auto;
}

.api-calls-grid.two > * {
  overflow: scroll;
}

.api-calls-grid.two > :first-child {
  height: calc(30vh - 12px);
}

.api-calls-grid.two > :last-child {
  height: calc(70vh - 12px);
  border-top: 1px solid var(--border-color--light);
}

.api-calls {
  width: 100vw;
  overflow: hidden;
}

.api-calls table {
  border-collapse: collapse;
  width: 100%;
}

.api-calls table tr:hover {
  cursor: pointer;
  background: var(--bg-color--light);
}

.api-calls table :-webkit-any(th, td) {
  text-align: left;
  white-space: nowrap;
  border-right: 1px solid var(--border-color--light);
  border-bottom: 1px solid var(--border-color--light);
  padding: 3px 6px;
  font-size: 12px;
}

.api-calls table tr.selected td {
  background: var(--bg-color--selected);
  color: var(--bg-color--default);
}

.api-call-details {
  box-sizing: border-box;
  padding: 6px 10px;
}

.api-call-details > div:nth-child(even) {
  padding: 8px 10px;
  border-radius: 4px;
  background: var(--bg-color--secondary);
  margin-bottom: 10px;
  width: 100%;
  box-sizing: border-box;
  overflow: auto;
}

.api-call-details pre {
  margin: 0;
  font-size: 12px;
}
`
export default cssStr