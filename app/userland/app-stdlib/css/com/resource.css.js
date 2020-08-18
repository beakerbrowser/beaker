import {css} from '../../vendor/lit-element/lit-element.js'
import buttonsCSS from '../buttons2.css.js'
import inputsCSS from '../inputs.css.js'
import tooltipCSS from '../tooltip.css.js'
import markdownCSS from '../markdown.css.js'

const cssStr = css`
${buttonsCSS}
${inputsCSS}
${tooltipCSS}
${markdownCSS}

:host {
  --text-color--result-link: blue;
  --bg-color--unread: #f2f7ff;
}

@media (prefers-color-scheme: dark) {
  :host {
    --text-color--result-link: #1043da;
    --bg-color--unread: #f2f7ff;
  }
}

/** COMMON RESOURCE STYLES **/

a {
  text-decoration: none;
  cursor: initial;
}

a[href]:hover {
  text-decoration: underline;
  cursor: pointer;
}

.resource .favicon {
  display: block;
  width: 16px;
  height: 16px;
  object-fit: cover;
  border-radius: 50%;
  margin-right: 8px;
  font-size: 14px;
}

.resource .sysicon {
  display: inline-block;
  height: 16px;
  width: 16px;
  font-size: 9px;
  line-height: 16px;
  background: var(--bg-color--semi-light);
  margin-right: 8px;
  border-radius: 50%;
}

.resource .title a {
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

/** EXPANDED LINK STYLES **/

.resource.expanded-link {
  display: flex;
  align-items: center;
  color: var(--text-color--lightish);
}

.resource.expanded-link:first-child {
  margin-top: 0;
}

.resource.expanded-link .thumb {
  display: block;
  width: 100px;
  flex: 0 0 100px;
  height: 100px;
  background: var(--bg-color--light);
  overflow: hidden;
  margin-right: 30px;
  display: none;
}

.resource.expanded-link .thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: scale-down;
}

.resource.expanded-link .thumb .icon {
  display: block;
  height: 100%;
  text-align: center;
  color: var(--text-color--light);
  line-height: 100px;
  font-size: 32px;
}

.resource.expanded-link .info {
  flex: 1;
  overflow: hidden;
}

.resource.expanded-link .info > * {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.resource.expanded-link .title {
  letter-spacing: 1px;
  margin-bottom: 6px;
  font-weight: 500;
  font-size: 19px;
}

.resource.expanded-link .title a {
  color: var(--text-color--result-link);
}

.resource.expanded-link .href {
  font-size: 14px;
  margin-bottom: 4px;
}

.resource.expanded-link .href a {
  color: var(--text-color--light);
}

.resource.expanded-link .href .fa-angle-right {
  font-size: 11px;
}

.resource.expanded-link .origin {
  display: flex;
  align-items: center;
  font-size: 13px;
}

.resource.expanded-link .origin-note {
  margin-right: 5px;
}

.resource.expanded-link .author {
  color: var(--text-color--lightish);
  font-weight: 500;
  margin-right: 6px;
}

.resource.expanded-link .date {
  color: var(--text-color--light);
  margin: 0 6px;
}

.resource.expanded-link .excerpt {
  white-space: initial;
  color: var(--text-color--light);
  margin-top: 10px;
  line-height: 1.3;
  font-size: 15px;
  letter-spacing: 0.4px;
}

.resource.expanded-link .ctrl {
  margin-left: 6px;
  font-size: 12px;
  color: var(--text-color--light);
  cursor: pointer;
}

.resource.expanded-link .ctrl:hover {
  text-decoration: underline;
}

.resource.expanded-link.as-card {
}

.resource.expanded-link.as-card:hover {
  cursor: pointer;

}

/** ACTION STYLES **/

.resource.action {
  display: flex;
  align-items: center;
  color: var(--text-color--lightish);
}

.resource.action.unread {
  background: var(--bg-color--unread);
  outline: 5px solid var(--bg-color--unread);
}

.resource.action > * {
  margin-right: 5px;
}

.resource.action .thumb {
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

.resource.action .thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: scale-down;
}

.resource.action .thumb .icon {
  display: block;
  width: 100%;
  height: 100%;
  text-align: center;
  color: var(--text-color--light);
  line-height: 30px;
  font-size: 12px;
}

.resource.action .thumb .icon .fa-lock {
  font-size: 8px;
  position: absolute;
  right: 3px;
  bottom: 27px;
}

.resource.action .author {
  color: var(--text-color--lightish);
  font-weight: 600;
}

/** LINK STYLES **/

.resource.link {
  display: flex;
  align-items: center;
  color: var(--text-color--lightish);
}

.resource.link.unread {
  background: var(--bg-color--unread);
  outline: 5px solid var(--bg-color--unread);
}

.resource.link .thumb {
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

.resource.link .thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: scale-down;
}

.resource.link .thumb .icon {
  display: block;
  width: 100%;
  height: 100%;
  text-align: center;
  color: var(--text-color--light);
  line-height: 30px;
  font-size: 12px;
}

.resource.link .thumb .icon .fa-lock {
  position: absolute;
  font-size: 8px;
  right: 0px;
  bottom: 24px;
}

.resource.link .thumb .icon .small-thumb {
  position: absolute;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  object-fit: cover;
  right: -6px;
  bottom: 20px;
  border: 2px solid var(--bg-color--default);
}

.resource.link .container {
  flex: 1;
}

.resource.link .action-description {
  display: flex;
  align-items: center;
  font-size: 13px;
  padding-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.resource.link .origin .author {
  color: var(--text-color--lightish);
  font-weight: 600;
}

.resource.link .title {
  max-width: 590px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-color--light);
  
}

.resource.link .title .link-title {
  letter-spacing: 0.5px;
  font-size: 17px;
  font-weight: 500;
  color: var(--text-color--result-link);
}

.resource.link .title .link-origin {
  color: var(--text-color--pretty-light);
}

.resource.link .date a {
  color: var(--text-color--light);
}

.resource.link .ctrls {
  font-size: 13px;
  color: var(--text-color--light);
}

.resource.link .ctrls :-webkit-any(.fas, .far) {
  font-size: 11px;
  position: relative;
  top: -1px;
}

.resource.link .ctrls a.ctrl {
  display: inline-block;
  color: var(--text-color--light);
  font-weight: 500;
  margin-left: 2px;
}

.resource.link .ctrls a:hover {
  cursor: pointer;
  color: var(--text-color--default);
}

.resource.link .ctrls a .fa-comment-alt {
  position: relative;
  top: 1px;
  font-size: 12px;
}

/** CARD STYLES **/

.resource.card {
  position: relative;
  display: grid;
  grid-template-columns: 45px 1fr;
  color: var(--text-color--lightish);
}

.resource.card.unread {
  background: var(--bg-color--unread);
  outline: 5px solid var(--bg-color--unread);
  margin-bottom: 5px;
}

.resource.card .info {
  display: flex;
  align-items: center;
}

.resource.card .thumb {
  display: block;
  width: 30px;
  height: 30px;
  background: var(--bg-color--semi-light);
  border-radius: 50%;
  position: relative;
  top: 8px;
}

.resource.card .thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: scale-down;
}

.resource.card .thumb .icon {
  display: block;
  width: 100%;
  height: 100%;
  text-align: center;
  color: var(--text-color--light);
  line-height: 20px;
  font-size: 8px;
}

.resource.card .arrow {
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

.resource.card.is-notification .arrow {
  background: var(--bg-color--light);
}

.resource.card.unread .arrow {
  border-color: var(--border-color--unread);
}

.resource.card .container {
  border: 1px solid var(--border-color--light);
  border-radius: 4px;
  background: var(--bg-color--default);
  padding: 2px;
}

.resource.card .container:hover {
  cursor: pointer;
  border: 1px solid var(--border-color--dark);
}

.resource.card.unread .container {
  border-color: var(--border-color--unread);
}

.resource.card .header {
  display: flex;
  align-items: baseline;
  font-size: 13px;
  max-width: 562px;
  padding: 8px 12px 6px;
}

.resource.card .header > * {
  margin-right: 5px;
  white-space: nowrap;
}

.resource.card .origin .icon {
  margin-right: 5px;
}

.resource.card .header a {
  color: var(--text-color--light);
}

.resource.card .origin .author {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-color--default);
}

.resource.card .title {
  font-weight: normal;
  letter-spacing: 0.5px;
}

.resource.card .title a {
  color: var(--text-color--result-link);
}

.resource.card .context {
  font-size: 12px;
  color: var(--text-color--light);
  overflow: hidden;
  text-overflow: ellipsis;
}

.resource.card .context .fa-reply {
  color: var(--text-color--very-light);
}

.resource.card .context a {
  color: var(--text-color--light);
}

.resource.card .context + .header {
  padding-top: 0;
}

.resource.card .content {
  white-space: initial;
  color: var(--text-color--default);
  line-height: 1.3125;
  font-size: 14px;
  padding: 0px 12px;
}

.resource.card .content > :first-child { margin-top: 0; }
.resource.card .content > :last-child { margin-bottom: 0; }

.resource.card .ctrls {
  padding: 6px 12px 6px;
}

.resource.card .ctrls a {
  display: inline-block;
  margin-right: 16px;
  color: var(--text-color--light);
  font-size: 13px;
}

.resource.card .ctrls a:hover {
  cursor: pointer;
  color: var(--text-color--default);
}

.resource.card .ctrls a :-webkit-any(.far, .fas) {
  color: var(--text-color--very-light);
}

.resource.card .ctrls a small {
  position: relative;
  top: -1px;
  letter-spacing: 0.5px;
  font-weight: 500;
}

.resource.card beaker-post-composer {
  display: block;
  padding: 10px;
}

:host([noborders]) .resource.card {
  grid-template-columns: 34px 1fr;
}

:host([noborders]) .resource.card .thumb {
  margin: 5px 0 0;
  width: 36px;
  height: 36px;
}

:host([noborders]) .resource.card .arrow {
  display: none;
}

:host([noborders]) .resource.card .container {
  border-color: transparent !important;
}

:host([noborders]) .resource.card beaker-post-composer {
  margin-left: -36px;
}

`
export default cssStr