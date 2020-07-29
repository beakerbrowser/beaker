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
  position: relative;
}

a {
  text-decoration: none;
  cursor: initial;
}

a[href]:hover {
  text-decoration: underline;
  cursor: pointer;
}

h2 {
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 4px 4px;
  box-sizing: border-box;
  font-weight: 500;
  color: var(--text-color--light);
  letter-spacing: 0.7px;
  font-size: 15px;
  border-bottom: 1px solid var(--border-color--light);
}

h2 a:hover {
  cursor: pointer;
  text-decoration: underline;
}

.result + h2 {
  margin-top: 20px;
}

.results {
  font-size: 14px;
  box-sizing: border-box;
  user-select: none;
}

:host(:not(.full-size)) .results {
  max-width: 1000px;
  margin: 0 auto;
}

.empty {
  font-size: 16px;
  letter-spacing: 0.7px;
  color: var(--text-color--light);
  padding: 120px 0px;
  background: var(--bg-color--light);
  text-align: center;
}

/** COMMON RESULT STYLES **/

.result .favicon {
  display: block;
  width: 16px;
  height: 16px;
  object-fit: cover;
  border-radius: 50%;
  margin-right: 8px;
}

.result .sysicon {
  display: inline-block;
  height: 16px;
  width: 16px;
  font-size: 9px;
  line-height: 16px;
  background: var(--bg-color--semi-light);
  margin-right: 8px;
  border-radius: 50%;
}

.result .title a {
  color: var(--color-text--default);
}

/** ROW STYLES **/

.result.row {
  display: flex;
  align-items: center;
  color: var(--text-color--lightish);
  margin: 28px 6px;
}

.result.row .thumb {
  display: block;
  width: 100px;
  flex: 0 0 100px;
  height: 100px;
  background: var(--bg-color--light);
  overflow: hidden;
  margin-right: 30px;
  display: none;
}

.result.row .thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: scale-down;
}

.result.row .thumb .icon {
  display: block;
  height: 100%;
  text-align: center;
  color: var(--text-color--light);
  line-height: 100px;
  font-size: 32px;
}

.result.row .info {
  flex: 1;
  overflow: hidden;
}

.result.row .info > * {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result.row .title {
  letter-spacing: 1px;
  margin-bottom: 6px;
  font-weight: 500;
  font-size: 19px;
}

.result.row .title a {
  color: var(--text-color--result-link);
}

.result.row .href {
  font-size: 14px;
  margin-bottom: 4px;
}

.result.row .href a {
  color: var(--text-color--light);
}

.result.row .href .fa-angle-right {
  font-size: 11px;
}

.result.row .origin {
  display: flex;
  align-items: center;
  font-size: 13px;
}

.result.row .origin-note {
  margin-right: 5px;
}

.result.row .author {
  color: var(--text-color--lightish);
  font-weight: 500;
  margin-right: 6px;
}

.result.row .date {
  color: var(--text-color--light);
}

.result.row .excerpt {
  white-space: initial;
  color: var(--text-color--light);
  margin-top: 10px;
  line-height: 1.3;
  font-size: 15px;
  letter-spacing: 0.4px;
}

.result.row .tags {
  margin: 5px 0 0;
  line-height: 1.3;
  font-size: 12px;
}
  
.result.row .tags a {
  letter-spacing: 0.3px;
  margin-right: 3px;
}

/** COMPACT ROW STYLES **/

.result.compact-row {
  display: flex;
  align-items: center;
  height: 38px;
  box-sizing: border-box;
  color: var(--text-color--lightish);
  border-bottom: 1px solid var(--border-color--semi-light);
  padding: 8px 4px;
}

.result.compact-row > * {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result.compact-row .thumb {
  display: block;
  width: 16px;
  flex: 0 0 16px;
  overflow: hidden;
  margin-right: 10px;
}

.result.compact-row .thumb img {
  display: block;
  width: 16px;
  height: 16px;
  object-fit: scale-down;
}

.result.compact-row .thumb .icon {
  display: block;
  text-align: center;
  color: var(--text-color--light);
  line-height: 16px;
  font-size: 14px;
}

.result.compact-row .title {
  padding-right: 10px;
  flex: 1;
}

.result.compact-row .title a {
  color: var(--text-color--default);
  font-weight: 500;
}

.result.compact-row .href {
  flex: 1;
  padding-right: 5px;
}

.result.compact-row .href a {
  color: var(--text-color--pretty-light);
}

.result.compact-row .excerpt {
  flex: 1;
  color: var(--text-color--pretty-light);
  padding-right: 5px;
}

.result.compact-row .origin {
  display: flex;
  align-items: center;
  flex: 0 0 150px;
}

.result.compact-row a.author {
  color: var(--text-color--light);
  overflow: hidden;
  text-overflow: ellipsis;
}

.result.compact-row .date {
  flex: 0 0 100px;
  text-align: right;
  color: var(--text-color--light);
}

.result.compact-row .ctrls {
  padding-left: 10px;
}

.result.compact-row .ctrls a {
  display: inline-block;
  padding: 2px 4px;
  border-radius: 4px;
  color: var(--text-color--pretty-light);
}

.result.compact-row .ctrls a:hover {
  cursor: pointer;
  background: var(--bg-color--semi-light);
  color: var(--text-color--light);
}

/** SIMPLE LIST STYLES **/

.result.simple-list-item {
  display: flex;
  align-items: center;
  color: var(--text-color--lightish);
  padding: 8px 4px;
  font-size: 13px;
}

.result.simple-list-item:hover {
  background: var(--bg-color--light);
  cursor: pointer;
  text-decoration: none;
}

.result.simple-list-item > * {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result.simple-list-item .thumb {
  display: block;
  width: 16px;
  flex: 0 0 16px;
  overflow: hidden;
  margin-right: 10px;
}

.result.simple-list-item .thumb img {
  display: block;
  width: 16px;
  height: 16px;
  object-fit: scale-down;
}

.result.simple-list-item .title {
  color: var(--text-color--lightish);
  font-weight: 500;
  padding-right: 10px;
}

/** SIMPLE GRID STYLES **/

.results.simple-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
}

.results.simple-grid h2 {
  grid-column-start: 1;
  grid-column-end: 4;
  width: 100%;
}

.result.simple-grid-item {
  color: var(--text-color--lightish);
  padding: 8px 6px;
}

.result.simple-grid-item:hover {
  background: var(--bg-color--light);
  cursor: pointer;
}

.result.simple-grid-item > * {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result.simple-grid-item .thumb {
}

.result.simple-grid-item .thumb img {
  display: block;
  width: 100%;
  height: 100px;
  object-fit: scale-down;
}

.result.simple-grid-item .title {
  margin-top: 5px;
  text-align: center;
}

.result.simple-grid-item .title a {
  color: var(--text-color--default);
  font-weight: 500;
}

/** ACTION STYLES **/

.result.action {
  color: var(--text-color--lightish);
  margin: 16px 4px;
}

.result.action .info {
  display: flex;
  align-items: center;
}

.result.action .thumb {
  display: block;
  width: 20px;
  flex: 0 0 20px;
  height: 20px;
  background: var(--bg-color--semi-light);
  border-radius: 50%;
  margin-right: 10px;
  position: relative;
  top: 1px;
}

.result.action .thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: scale-down;
}

.result.action .thumb .icon {
  display: block;
  width: 100%;
  height: 100%;
  text-align: center;
  color: var(--text-color--light);
  line-height: 20px;
  font-size: 8px;
}

.result.action .action-description {
  display: flex;
  align-items: center;
  font-size: 14px;
  height: 30px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result.action .action-description > * {
  margin-right: 5px;
}

.result.action .origin .icon {
  margin-right: 5px;
}

.result.action .origin .author {
  color: var(--text-color--lightish);
  font-weight: 600;
  margin-left: 3px;
}

.result.action .title {
  font-weight: normal;
  letter-spacing: 0.5px;
}

.result.action .title a {
  color: var(--text-color--result-link);
}

.result.action .tags {
  margin: 0 0 0 54px;
  line-height: 1.3;
  font-size: 12px;
}

.result.action .tags a {
  color: var(--text-color--light);
  letter-spacing: 0.3px;
  margin-right: 3px;
}

.result.action .excerpt {
  display: none;
  white-space: initial;
  color: var(--text-color--default);
  margin: 10px 14px 14px 56px;
  line-height: 1.3;
  font-size: 14px;
}

/** CARD STYLES **/

.result.card {
  color: var(--text-color--lightish);
  margin: 22px 6px;
  border: 1px solid var(--border-color--light);
  border-radius: 4px;
  padding: 10px 12px;
  max-width: 660px;
}

.result.card > * {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result.card .origin {
  display: flex;
  align-items: center;
  font-size: 13px;
}

.result.card .author {
  color: var(--text-color--lightish);
  font-weight: 500;
  margin-right: 6px;
}

.result.card .href a {
  color: var(--text-color--light);
}

.result.card .href .fa-angle-right {
  font-size: 11px;
  width: 8px;
}

.result.card .date {
  color: var(--text-color--light);
  margin-left: auto;
}

.result.card .excerpt {
  white-space: initial;
  color: var(--text-color--default);
  margin: 10px 0;
  line-height: 1.4;
  font-size: 14px;
  letter-spacing: 0.4px;
}

.result.card .excerpt > :first-child {
  margin-top: 0;
}

.result.card .excerpt > :last-child {
  margin-bottom: 0;
}

.result.card .excerpt * {
  max-width: 100%;
}

.result.card .ctrls {
  font-size: 12px;
}

.result.card .ctrls a {
  color: var(--text-color--light);
  cursor: pointer;
  margin-right: 10px;
}
`
export default cssStr