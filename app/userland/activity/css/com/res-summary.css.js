import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import markdownCSS from 'beaker://app-stdlib/css/markdown.css.js'
import tooltipCSS from 'beaker://app-stdlib/css/tooltip.css.js'

const cssStr = css`
${markdownCSS}
${tooltipCSS}

:host {
  display: block;
  border-bottom: 1px solid var(--border-color--light);
  background: var(--bg-color--default);
  padding: 10px 15px 10px;
  max-height: 200px;
  overflow: auto;
}

.summary {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: var(--text-color--light);
  margin-bottom: 5px;
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

.container {
  flex: 1;
  margin-left: 5px;
}

.title {
  font-size: 19px;
  font-weight: 500;
  letter-spacing: 0.7px;
  margin-bottom: 5px;
}

.content {
  color: var(--text-color--default);
  margin: 5px 0;
}

.content > :first-child { margin-top: 0; }
.content > :last-child { margin-bottom: 0; }

`
export default cssStr