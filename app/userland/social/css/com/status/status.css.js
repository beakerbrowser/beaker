import {css} from '../../../vendor/lit-element/lit-element.js'
import buttons2css from '../../buttons.css.js'

const cssStr = css`
${buttons2css}

:host {
  --body-font-size: 15px;
  --header-font-size: 13px;
  --title-font-size: 14px;
  --footer-font-size: 12px;
  --inner-width: initial;
  --title-color: #334;
  --header-color: #889;
  --footer-color: #889;
  --border-color: transparent;

  display: block;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: #fff;
}

:host([expandable]) {
  cursor: pointer;
}

:host([expandable]) .inner:hover {
  background: #fbfbfb;
  border-radius: 4px;
}

a {
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

.inner {
  display: flex;
  align-items: center;
  width: var(--inner-width);
}

.content-column {
  flex: 1;
}

.header {
  position: relative;
  display: flex;
  align-items: center;
  padding: 8px 16px 4px;
  font-size: var(--header-font-size);
  line-height: var(--header-font-size);
  color: var(--header-color);
}

.avatar {
  position: absolute;
  left: -28px;
  top: -20px;
}

.avatar img {
  display: inline-block;
  border-radius: 50%;
  object-fit: cover;
  width: 48px;
  height: 48px;
  border: 5px solid #fff;
}

.title {
  font-size: var(--title-font-size);
  color: var(--title-color);
  font-weight: bold;
  margin-right: 12px;
  margin-left: 20px;
  line-height: 17px;
}

.id,
.date {
  color: inherit;
  margin-right: 12px;
  letter-spacing: 0.2px;
}

.header .menu {
  margin-left: auto;
  padding: 2px 4px;
}

.body {
  color: rgba(0, 0, 0, 0.9);
  padding: 6px 18px;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--body-font-size);
  line-height: 1.4;
  white-space: pre-line;
}

.readmore {
  display: inline-block;
  margin: 6px 18px;
  color: gray;
}

.footer {
  display: flex;
  align-items: center;
  font-size: var(--footer-font-size);
  color: var(--footer-color);
  padding: 4px 18px 8px;
}

.footer a {
  margin: 0 5px;
  color: inherit;
}

.footer > * {
  white-space: nowrap;
}

.footer a:first-child {
  margin-left: 0;
}

beaker-reactions {
  display: flex;
  flex-wrap: wrap;
  margin-left: 8px;
}

.permalink {
  color: inherit;
}

.embed {
  display: flex;
  padding: 10px 20px;
  border-bottom: 1px solid var(--light-border-color);
}

.embed img {
  display: block;
  width: 90px;
  border-radius: 4px;
}

.embed .embed-details {
  padding: 10px 26px;
}

.embed .embed-details > * {
  margin: 4px 0;
}

.embed .embed-title {
  font-size: 16px;
  font-weight: bold;
}

.embed .embed-description {
  color: var(--color-text--muted);
}
`
export default cssStr
