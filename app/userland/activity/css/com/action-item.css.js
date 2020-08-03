import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'

const cssStr = css`
:host {
  display: block;
  margin: 15px 0;
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
  background: var(--bg-color--light);
  border-bottom: 1px solid var(--border-color--light);
  border-top-left-radius: 3px;
  border-top-right-radius: 3px;
  padding: 5px 9px;
  font-size: 12px;
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
  background: var(--bg-color--light);
  border-top: 1px solid var(--border-color--light);
  border-left: 1px solid var(--border-color--light);
  transform: rotate(-45deg);
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
  border: 1px solid var(--border-color--light);
  border-radius: 4px;
  flex: 1;
  margin-left: 5px;
}

.content {
  padding: 0 10px;
  color: var(--text-color--default);
}

.content { font-size: 14px; }
.content h1 { font-family: arial; font-size: 21px; font-weight: 600; padding-bottom: 5px; border-bottom: 1px solid var(--border-color--semi-light); }
.content h2 { font-family: arial; font-size: 19px; font-weight: 600; padding-bottom: 4px; border-bottom: 1px solid var(--border-color--semi-light); }
.content h3 { font-family: arial; font-size: 19px; font-weight: 500; }
.content h4 { font-family: arial; font-size: 16px; font-weight: 600; }
.content h5 { font-family: arial; font-size: 16px; font-weight: 500; }

`
export default cssStr