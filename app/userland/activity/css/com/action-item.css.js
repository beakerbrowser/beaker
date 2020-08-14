import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import markdownCSS from './markdown.css.js'
import tooltipCSS from 'beaker://app-stdlib/css/tooltip.css.js'

const cssStr = css`
${markdownCSS}
${tooltipCSS}

:host {
  display: block;
  margin: 10px 0;
}

.summary {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: var(--text-color--light);
}

.summary.with-content {
  align-items: flex-start;
}

.summary.with-content .thumb {
  position: relative;
  top: 5px;
}

.summary.header {
  position: relative;
  padding: 5px 9px 0;
  font-size: 11px;
}

.summary.header:before {
  content: '';
  display: block;
  position: absolute;
  top: 8px;
  left: -5px;
  width: 8px;
  height: 8px;
  z-index: 1;
  background: var(--bg-color--default);
  border-top: 1px solid var(--border-color--light);
  border-left: 1px solid var(--border-color--light);
  transform: rotate(-45deg);
}

.summary:not(.with-content) > * {
  white-space: nowrap;
}

.summary > *:not(:last-child) {
  margin-right: 5px;
}

a {
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

.thumb {
  margin-right: 8px !important;
}

.summary:not(.with-content) .thumb {
  margin-right: 15px !important;
}

.thumb img {
  display: block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  object-fit: cover;
}

.icon {
  margin-right: 8px;
}

.author {
  color: var(--text-color--default);
  font-weight: 500;
}

.date {
  color: var(--text-color--light);
}

.item {
  overflow: hidden;
  text-overflow: ellipsis;
}

.container {
  border: 1px solid var(--border-color--light);
  background: var(--bg-color--default);
  border-radius: 4px;
  flex: 1;
  max-width: 600px;
  margin-left: 5px;
}

.content {
  font-size: 14px;
  padding: 8px 10px 10px;
  color: var(--text-color--default);
}

.content > :first-child { margin-top: 0; }
.content > :last-child { margin-bottom: 0; }

`
export default cssStr