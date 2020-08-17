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

h2.results-header {
  margin: 0 0 30px;
  padding: 0 4px 4px;
  text-align: center;
  color: var(--text-color--default);
  box-sizing: border-box;
  font-weight: 500;
  color: var(--text-color--light);
  letter-spacing: 0.7px;
  font-size: 13px;
  border-bottom: 1px solid var(--border-color--light);
}

h2.results-header:not(:first-child) {
  margin-top: 10px;
}

h2.results-header span {
  position: relative;
  top: 11px;
  background: var(--bg-color--default);
  padding: 5px;
}

h2 a:hover {
  cursor: pointer;
  text-decoration: underline;
}

.result + h2 {
  margin-top: 20px;
}

.bragging {
  color: var(--text-color--pretty-light);
  margin: 0 5px 20px;
}

.bragging .search-engine {
  display: inline-block;
  margin: 0 3px;
  position: relative;
  top: 5px;
}

.bragging .search-engine:first-of-type {
  margin-left: 4px;
}

.bragging .search-engine:hover {
  text-decoration: none;
}

.bragging .search-engine img {
  display: inline-block;
  width: 18px;
  height: 18px;
  object-fit: cover;
}

.results {
  font-size: 14px;
  box-sizing: border-box;
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

.notification {
  padding: 5px 4px 4px 58px;
  margin-right: 19px;
  font-size: 14px;
  color: var(--text-color--light);
}

.notification.unread {
  background: var(--bg-color--unread);
}

.notification a {
  color: var(--text-color--light);
}

/** ROW STYLES **/

.result.row {
  display: flex;
  align-items: center;
  color: var(--text-color--lightish);
  margin: 28px 6px;
}

.results > .result.row:first-child {
  margin-top: 0;
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
  margin: 0 6px;
}

.result.row .excerpt {
  white-space: initial;
  color: var(--text-color--light);
  margin-top: 10px;
  line-height: 1.3;
  font-size: 15px;
  letter-spacing: 0.4px;
}

.result.row .ctrl {
  margin-left: 6px;
  font-size: 12px;
  color: var(--text-color--light);
  cursor: pointer;
}

.result.row .ctrl:hover {
  text-decoration: underline;
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

.result.row.as-card {
}

.result.row.as-card:hover {
  cursor: pointer;

}

/** ACTION STYLES **/

.result.action {
  display: flex;
  align-items: center;
  color: var(--text-color--lightish);
  margin: 20px 24px 20px 4px;
}

.result.action.unread {
  background: var(--bg-color--unread);
  outline: 5px solid var(--bg-color--unread);
}

.result.action > * {
  margin-right: 5px;
}

.result.action .thumb {
  display: block;
  width: 30px;
  flex: 0 0 30px;
  height: 30px;
  background: var(--bg-color--semi-light);
  border-radius: 50%;
  margin-right: 18px;
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
  line-height: 30px;
  font-size: 12px;
}

.result.action .thumb .icon .fa-lock {
  font-size: 8px;
  position: absolute;
  right: 3px;
  bottom: 27px;
}

.result.action .author {
  color: var(--text-color--lightish);
  font-weight: 600;
}

/** LINK STYLES **/

.result.link {
  display: flex;
  align-items: center;
  color: var(--text-color--lightish);
  margin: 24px 24px 24px 4px;
}

.result.link.unread {
  background: var(--bg-color--unread);
  outline: 5px solid var(--bg-color--unread);
}

.result.link .thumb {
  display: block;
  width: 30px;
  flex: 0 0 30px;
  height: 30px;
  background: var(--bg-color--semi-light);
  border-radius: 50%;
  margin-right: 18px;
  position: relative;
  top: 1px;
}

.result.link .thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: scale-down;
}

.result.link .thumb .icon {
  display: block;
  width: 100%;
  height: 100%;
  text-align: center;
  color: var(--text-color--light);
  line-height: 30px;
  font-size: 12px;
}

.result.link .thumb .icon .fa-lock {
  position: absolute;
  font-size: 8px;
  right: 0px;
  bottom: 24px;
}

.result.link .thumb .icon .small-thumb {
  position: absolute;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  object-fit: cover;
  right: -6px;
  bottom: 20px;
  border: 2px solid var(--bg-color--default);
}

.result.link .container {
  flex: 1;
}

.result.link .action-description {
  display: flex;
  align-items: center;
  font-size: 13px;
  padding-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result.link .origin .author {
  color: var(--text-color--lightish);
  font-weight: 600;
}

.result.link .title {
  max-width: 590px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-color--light);
  
}

.result.link .title .link-title {
  letter-spacing: 0.5px;
  font-size: 17px;
  font-weight: 500;
  color: var(--text-color--result-link);
}

.result.link .title .link-origin {
  color: var(--text-color--pretty-light);
}

.result.link .date a {
  color: var(--text-color--light);
}

.result.link .tags {
  padding: 0 0 4px;
}

.result.link .tags a {
  display: inline-block;
  color: var(--text-color--light);
  background: var(--bg-color--semi-light);
  padding: 0 6px 1px;
  font-size: 12px;
  border-radius: 4px;
  letter-spacing: 0.3px;
  margin-right: 3px;
}

.result.link .ctrls {
  font-size: 13px;
  color: var(--text-color--light);
}

.result.link .ctrls :-webkit-any(.fas, .far) {
  font-size: 11px;
  position: relative;
  top: -1px;
}

.result.link .ctrls a.ctrl {
  display: inline-block;
  color: var(--text-color--light);
  font-weight: 500;
  margin-left: 2px;
}

.result.link .ctrls a:hover {
  cursor: pointer;
  color: var(--text-color--default);
}

.result.link .ctrls a .fa-comment-alt {
  position: relative;
  top: 1px;
  font-size: 12px;
}

/** CARD STYLES **/

.result.card {
  position: relative;
  display: grid;
  grid-template-columns: 45px 1fr;
  margin: 10px 24px 10px 4px;
  color: var(--text-color--lightish);
}

.result.card.unread {
  background: var(--bg-color--unread);
  outline: 5px solid var(--bg-color--unread);
  margin-bottom: 5px;
}

.result.card .info {
  display: flex;
  align-items: center;
}

.result.card .thumb {
  display: block;
  width: 30px;
  height: 30px;
  background: var(--bg-color--semi-light);
  border-radius: 50%;
  margin-right: 10px;
  position: relative;
  top: 8px;
}

.result.card .thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: scale-down;
}

.result.card .thumb .icon {
  display: block;
  width: 100%;
  height: 100%;
  text-align: center;
  color: var(--text-color--light);
  line-height: 20px;
  font-size: 8px;
}

.result.card .arrow {
  content: '';
  display: block;
  position: absolute;
  top: 20px;
  left: 41px;
  width: 8px;
  height: 8px;
  z-index: 10;
  background: var(--bg-color--default);
  border-top: 1px solid var(--border-color--light);
  border-left: 1px solid var(--border-color--light);
  transform: rotate(-45deg);
}

.result.card.is-notification .arrow {
  background: var(--bg-color--light);
}

.result.card.unread .arrow {
  border-color: var(--border-color--unread);
}

.result.card .container {
  border: 1px solid var(--border-color--light);
  border-radius: 4px;
  background: var(--bg-color--default);
  padding: 2px;
}

.result.card .container:hover {
  cursor: pointer;
  border: 1px solid var(--border-color--dark);
}

.result.card.unread .container {
  border-color: var(--border-color--unread);
}

.result.card .header {
  display: flex;
  align-items: baseline;
  font-size: 13px;
  max-width: 562px;
  padding: 8px 12px 6px;
}

.result.card .header > * {
  margin-right: 5px;
  white-space: nowrap;
}

.result.card .origin .icon {
  margin-right: 5px;
}

.result.card .header a {
  color: var(--text-color--light);
}

.result.card .origin .author {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-color--default);
}

.result.card .title {
  font-weight: normal;
  letter-spacing: 0.5px;
}

.result.card .title a {
  color: var(--text-color--result-link);
}

.result.card .tags {
  padding: 8px 12px 0;
}

.result.card .tags a {
  display: inline-block;
  color: var(--text-color--light);
  background: var(--bg-color--semi-light);
  padding: 0 6px 1px;
  font-size: 12px;
  border-radius: 4px;
  letter-spacing: 0.3px;
  margin-right: 3px;
}

.result.card .context {
  font-size: 12px;
  color: var(--text-color--light);
  overflow: hidden;
  text-overflow: ellipsis;
}

.result.card .context .fa-reply {
  color: var(--text-color--very-light);
}

.result.card .context a {
  color: var(--text-color--light);
}

.result.card .context + .header {
  padding-top: 0;
}

.result.card .content {
  white-space: initial;
  color: var(--text-color--default);
  line-height: 1.3125;
  font-size: 14px;
  padding: 0px 12px;
}

.result.card .content > :first-child { margin-top: 0; }
.result.card .content > :last-child { margin-bottom: 0; }
.result.card .content h1 { font-family: arial; font-size: 21px; font-weight: 600; padding-bottom: 5px; border-bottom: 1px solid var(--border-color--semi-light); }
.result.card .content h2 { font-family: arial; font-size: 19px; font-weight: 600; padding-bottom: 4px; border-bottom: 1px solid var(--border-color--semi-light); }
.result.card .content h3 { font-family: arial; font-size: 19px; font-weight: 500; }
.result.card .content h4 { font-family: arial; font-size: 16px; font-weight: 600; }
.result.card .content h5 { font-family: arial; font-size: 16px; font-weight: 500; }
.result.card .content pre { font-size: 13px; }
.result.card .content :-webkit-any(video, audio, img) { max-width: 100%; }
.result.card .content a { color: var(--text-color--content-link); }

.result.card .ctrls {
  padding: 6px 12px 8px;
}

.result.card .ctrls a {
  display: inline-block;
  margin-right: 16px;
  color: var(--text-color--light);
}

.result.card .ctrls a:hover {
  cursor: pointer;
  color: var(--text-color--default);
}

.result.card .ctrls a :-webkit-any(.far, .fas) {
  color: var(--text-color--very-light);
}

.result.card .ctrls a small {
  position: relative;
  top: -1px;
  letter-spacing: 0.5px;
  font-weight: 500;
}

/** INTERACTIONS BTWN TYPES */

.notification + .result {
  margin-top: 0;
}
.result + .notification {
  margin-top: 15px;
}
`
export default cssStr