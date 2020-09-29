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

/** COMMON RECORD STYLES **/

:host {
  display: block;
}

a {
  text-decoration: none;
  cursor: initial;
}

a:hover {
  text-decoration: underline;
  cursor: pointer;
}

.record .favicon {
  display: block;
  width: 16px;
  height: 16px;
  object-fit: cover;
  border-radius: 50%;
  margin-right: 8px;
  font-size: 14px;
}

.record .sysicon {
  display: inline-block;
  width: 100%;
  font-size: 12px;
  line-height: 30px;
  color: var(--text-color--private-link);
  text-align: center;
}

.record .title a {
  color: var(--color-text--default);
}

.unknown-link {
  display: inline-block;
  max-width: 100%;
  box-sizing: border-box;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-color--result-link);
  padding: 10px 14px;
}

.vote-ctrl :-webkit-any(.far, .fas) {
  font-size: 13px;
}

.vote-ctrl a {
  display: inline-block;
  padding: 0 4px;
  border-radius: 4px;
  margin-right: 18px;
  color: var(--text-color--pretty-light);
}

.vote-ctrl a.pressed {
  font-weight: bold;
  color: var(--text-color--link);
}

.vote-ctrl a:hover {
  text-decoration: none;
  background: var(--bg-color--semi-light);
}

.vote-ctrl .count {
  font-size: 13px;
}

.comment-ctrl {
  display: inline-block;
  padding: 0 4px;
  border-radius: 4px;
  margin-right: 4px;
  color: var(--text-color--pretty-light);
}

.comment-ctrl:hover {
  text-decoration: none;
  background: var(--bg-color--semi-light);
}

.comment-ctrl .far {
  margin-right: 2px;
  font-size: 12px;
}

.notification {
  padding: 5px 4px 4px 48px;
  margin-right: 19px;
  font-size: 14px;
  color: var(--text-color--light);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.notification.unread {
  background: var(--bg-color--unread);
}

.notification a {
  color: var(--text-color--light);
}

:host([render-mode="comment"]) .notification {
  padding: 0 12px 5px;
}

.image-loading {
  width: 14px;
  height: 14px;
  background: url(beaker://assets/spinner.gif);
  background-size: 100%;
}

/** EXPANDED LINK STYLES **/

.record.expanded-link {
  display: flex;
  align-items: center;
  color: var(--text-color--lightish);
}

.record.expanded-link .thumb {
  display: block;
  width: 100px;
  flex: 0 0 100px;
  height: 100px;
  background: var(--bg-color--light);
  overflow: hidden;
  margin-right: 30px;
  display: none;
}

.record.expanded-link .thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.record.expanded-link .info {
  flex: 1;
  overflow: hidden;
}

.record.expanded-link .title {
  margin-bottom: 6px;
  font-weight: 500;
  font-size: 18px;
}

.record.expanded-link .title a {
  color: var(--text-color--result-link);
}

.record.expanded-link.private .title a {
  color: var(--text-color--private-link);
}

.record.expanded-link .href {
  font-size: 14px;
  margin-bottom: 4px;
}

.record.expanded-link .href a {
  color: var(--text-color--light);
}

.record.expanded-link .href .fa-angle-right {
  font-size: 11px;
}

.record.expanded-link .origin {
  display: flex;
  align-items: center;
  font-size: 13px;
}

.record.expanded-link .origin-note {
  margin-right: 5px;
}

.record.expanded-link .author {
  color: var(--text-color--lightish);
  font-weight: 500;
  margin-right: 6px;
}

.record.expanded-link.private .author {
  color: var(--text-color--private-default);
}

.record.expanded-link .type {
  margin: 0 6px;
}

.record.expanded-link .date {
  color: var(--text-color--light);
  margin: 0 6px;
}

.record.expanded-link .excerpt {
  white-space: initial;
  color: var(--text-color--light);
  margin-top: 10px;
  line-height: 1.3;
  font-size: 15px;
  letter-spacing: 0.4px;
}

.record.expanded-link .ctrl {
  margin-left: 6px;
  font-size: 12px;
  color: var(--text-color--light);
  cursor: pointer;
}

.record.expanded-link .ctrl:hover {
  text-decoration: underline;
}

.record.expanded-link .vote-ctrl {
  margin: 0 5px;
}

.record.expanded-link .vote-ctrl a {
  margin-right: 0px;
}

.record.expanded-link .comment-ctrl {
  margin: 0 0 0 2px;
}

/** ACTION STYLES **/

.record.action {
  display: flex;
  align-items: center;
  color: var(--text-color--lightish);
}

:host([thread-view]) .record.action,
:host(.small) .record.action {
  padding: 8px 14px;
  align-items: baseline;
  color: var(--text-color--light);
  font-size: 13px;
}

.record.action.unread {
  background: var(--bg-color--unread);
  box-shadow: 0 0 0 5px var(--bg-color--unread);
  border-radius: 1px;
}

:host([thread-view]) .record.action.unread {
  box-shadow: none;
}

.record.action > * {
  margin-right: 5px;
}

.record.action .thumb {
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

:host([thread-view]) .record.action .thumb {
  width: 14px;
  height: 14px;
  flex: 0 0 14px;
  margin: 0 5px 0 0;
  top: 2px;
}

:host(.small) .record.action .thumb {
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  margin: 0 10px 0 0;
  top: 5px;
}

.record.action .thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.record.action .author {
  color: var(--text-color--default);
  font-weight: 600;
}

.record.action .subject,
.record.action .others {
  color: var(--text-color--result-link);
}

:host([thread-view]) .record.action .author {
  font-weight: normal;
}

.record.action .action a {
  color: var(--text-color--link);
}

.record.action .date {
  color: inherit;
}

.action-content {
  letter-spacing: 0.1px;
  line-height: 1.4;
  font-size: 14px;
  padding: 10px;
  margin: 0px 30px 10px;
  border: 1px solid var(--border-color--light);
  border-radius: 4px;
}

.action-content a {
  color: var(--text-color--default);
}

:host([noborders]) .action-content {
  padding: 0 30px 10px;
  margin: -3px 0 0;
  border: 0;
}

/** LINK STYLES **/

.record.link {
  display: flex;
  align-items: center;
  color: var(--text-color--lightish);
}

:host([as-context]) .record.link {
  padding: 8px 14px 10px;
}

.record.link.unread {
  background: var(--bg-color--unread);
  box-shadow: 0 0 0 5px var(--bg-color--unread);
  border-radius: 1px;
}

.record.link .thumb {
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

:host([nothumb]) .record.link .thumb {
  display: none;
}

.record.link.private .thumb {
  background: var(--bg-color--private-light);
}

.record.link .thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.record.link .container {
  flex: 1;
}

.record.link .action-description {
  display: flex;
  align-items: center;
  font-size: 13px;
  padding-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.record.link .origin .author {
  color: var(--text-color--lightish);
  font-weight: 600;
}

.record.link.private .origin .author {
  color: var(--text-color--private-default);
}

.record.link .title {
  color: var(--text-color--light); 
}

.record.link .title .link-title {
  letter-spacing: 0.5px;
  font-size: 17px;
  font-weight: 500;
  color: var(--text-color--result-link);
}

.record.link.private .title .link-title {
  color: var(--text-color--private-link);
}

.record.link .title .link-origin {
  color: inherit;
}

.record.link .date a {
  color: var(--text-color--light);
}

.record.link .ctrls {
  font-size: 13px;
  color: var(--text-color--light);
  margin-top: 2px;
}

.record.link .ctrls .vote-ctrl a {
  margin-right: 0px;
}

.record.link .ctrls .comment-ctrl {
  margin: 0 0 0 2px;
}

/** CARD STYLES **/

.record.card {
  position: relative;
  display: grid;
  grid-template-columns: 45px 1fr;
  color: var(--text-color--lightish);
}

.record.card.unread {
  background: var(--bg-color--unread);
  box-shadow: 0 0 0 5px var(--bg-color--unread);
  margin-bottom: 5px;
  border-radius: 1px;
}

.record.card .info {
  display: flex;
  align-items: center;
}

.record.card .thumb {
  display: block;
  width: 30px;
  height: 30px;
  background: var(--bg-color--semi-light);
  border-radius: 50%;
  position: relative;
  top: 8px;
}

.record.card.private .thumb {
  background: var(--bg-color--private-light);
}

.record.card .thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

:host([noborders]) .record.card .thumb .sysicon {
  line-height: 33px;
}

.record.card .arrow {
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

.record.card.private .arrow {
  border-left-style: dashed;
  border-top-style: dashed;
}

.record.card.is-notification .arrow {
  background: var(--bg-color--light);
}

.record.card.unread .arrow {
  border-color: var(--border-color--unread);
}

.record.card .container {
  border: 1px solid var(--border-color--light);
  border-radius: 4px;
  background: var(--bg-color--default);
  padding: 2px;
  min-width: 0; /* this is a hack to make the overflow: hidden work */
}

.record.card.private .container {
  border-style: dashed;
}

.record.card .container:hover {
  cursor: pointer;
  border-color: var(--border-color--dark);
}

.record.card.unread .container {
  background: transparent;
  border-color: var(--border-color--unread);
}

.record.card .header {
  display: flex;
  align-items: baseline;
  font-size: 14px;
  padding: 8px 12px 6px;
  color: var(--text-color--light);
}

.record.card .header > * {
  margin-right: 5px;
  white-space: nowrap;
}

.record.card .origin .icon {
  margin-right: 5px;
}

.record.card .header a {
  color: inherit;
}

.record.card .origin .author {
  font-weight: 600;
  font-size: 15px;
  color: var(--text-color--default);
}

.record.card.private .origin .author {
  color: var(--text-color--private-default);
}

.record.card .title {
  font-weight: normal;
  letter-spacing: 0.5px;
}

.record.card .title a {
  color: var(--text-color--result-link);
}

.card-context {
  position: relative;
  display: block;
  opacity: 0.8;
  background: var(--bg-color--secondary);
  box-sizing: border-box;
  border: 1px solid var(--border-color--light);
  border-bottom: 0;
  margin: 0 0 0 45px;
  border-top-left-radius: 3px;
  border-top-right-radius: 3px;
}

.record.card .content {
  white-space: initial;
  word-break: break-word;
  color: var(--text-color--default);
  line-height: 1.3125;
  font-size: 15px;
  letter-spacing: 0.1px;
  padding: 0px 12px;
}

.record.card.constrain-height .content {
  max-height: 50px;
  overflow: hidden;
}

.record.card .content > :first-child { margin-top: 0; }
.record.card .content > :last-child { margin-bottom: 0; }

.record.card .read-more {
  padding: 2px 12px;
}

.record.card .read-more a {
  color: var(--text-color--link);
}

.record.card .ctrls {
  padding: 8px 12px;
  font-size: 12px;
}

.record.card beaker-post-composer {
  display: block;
  padding: 10px;
}

:host([noborders]) .record.card {
  grid-template-columns: 34px 1fr;
}

:host([noborders]) .record.card .thumb {
  margin: 5px 0 0;
  width: 36px;
  height: 36px;
}

:host([noborders]) .record.card .arrow,
:host([nothumb]) .record.card .arrow {
  display: none;
}

:host([noborders]) .record.card .container {
  border-color: transparent !important;
  background: none;
}

:host([nothumb]) .record.card {
  display: block;
}

:host([nothumb]) .record.card .thumb {
  display: none;
}

:host([noborders]) .record.card beaker-post-composer {
  margin-left: -36px;
}

/** COMMENT STYLES **/

.record.comment {
  position: relative;
  padding: 10px 14px 8px;
  border-radius: 4px;
}

.record.comment::before {
  content: "";
  display: block;
  position: absolute;
  left: 19px;
  top: 32px;
  width: 1px;
  height: calc(100% - 32px);
  background: var(--border-color--semi-light);
}

.record.comment.unread {
  background: var(--bg-color--unread);
  box-shadow: 0 0 0 5px var(--bg-color--unread);
  border-radius: 1px;
  border: 1px solid var(--border-color--unread);
}

.record.comment .header {
  display: flex;
  align-items: center;
  font-size: 13px;
  padding: 0 0 4px;
}

.record.comment .header > * {
  margin-right: 5px;
  white-space: nowrap;
}

.record.comment .header a {
  color: var(--text-color--light);
}

.record.comment .thumb {
  width: 14px;
  height: 14px;
  background: var(--bg-color--semi-light);
  border-radius: 50%;
}

.record.comment .thumb img {
  display: block;
  width: 14px;
  height: 14px;
  object-fit: cover;
}

.record.comment .origin .author {
  color: var(--text-color--default);
}

.record.comment.private .origin .author {
  color: var(--text-color--private-default);
}

.record.comment .title {
  font-weight: normal;
  letter-spacing: 0.5px;
}

.record.comment .title a {
  color: var(--text-color--result-link);
}

.record.comment .action {
  color: var(--text-color--light);
}

.record.comment .context {
  box-sizing: border-box;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.record.comment .content {
  white-space: initial;
  color: var(--text-color--default);
  line-height: 1.3125;
  font-size: 14px;
  letter-spacing: 0.1px;
  padding-left: 18px;
}

.record.comment.constrain-height .content {
  max-height: 50px;
  overflow: hidden;
}

.record.comment .content > :first-child { margin-top: 0; }
.record.comment .content > :last-child { margin-bottom: 0; }

.record.comment .read-more {
  padding: 4px 18px 0;
}

.record.comment .read-more a {
  color: var(--text-color--link);
}

.record.comment .ctrls {
  padding: 6px 0 0 18px;
}

.record.comment .ctrls a {
  display: inline-block;
  color: var(--text-color--light);
  font-size: 13px;
}

.record.comment .ctrls a:hover {
  cursor: pointer;
  color: var(--text-color--default);
}

.record.comment .ctrls a :-webkit-any(.far, .fas) {
  color: var(--text-color--very-light);
}

.record.comment .ctrls a small {
  position: relative;
  top: -1px;
  letter-spacing: 0.5px;
  font-weight: 500;
}

.record.comment beaker-post-composer {
  display: block;
  padding: 10px 20px;
}

/** WRAPPER STYLES **/

.record.wrapper {
  display: flex;
  align-items: ceflex-startnter;
  color: var(--text-color--lightish);
}

.record.wrapper.unread {
  background: var(--bg-color--unread);
  box-shadow: 0 0 0 5px var(--bg-color--unread);
  border-radius: 1px;
}

.record.wrapper .thumb {
  display: block;
  width: 30px;
  flex: 0 0 30px;
  height: 30px;
  background: var(--bg-color--semi-light);
  border-radius: 50%;
  margin-right: 14px;
  position: relative;
  top: -26px;
}

:host([nothumb]) .record.wrapper .thumb {
  display: none;
}

.record.wrapper.private .thumb {
  background: var(--bg-color--private-light);
}

.record.wrapper .thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.record.wrapper .container {
  flex: 1;
  background: var(--bg-color--light);
  border-radius: 4px;
}


`
export default cssStr