import {css} from '../../vendor/lit-element/lit-element.js'
import buttonsCSS from '../buttons.css.js'

const cssStr = css`
${buttonsCSS}

:host {
  display: block;
}

:host > h4,
.sidebar-md h1 {
  font-size: 14px;
  margin: 0;
  padding: 0 4px;
  border-bottom: 1px solid #ccd;
  height: 29px;
  line-height: 29px;
  font-weight: 500;
}

.description,
.admin {
  padding: 12px 4px;
  font-size: 15px;
}

.description,
.sidebar-md p,
.sidebar-md ul {
  opacity: 0.75;
  letter-spacing: 0.4px;
}

.groupware-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-gap: 10px;
  padding: 15px 5px 10px;
}

.groupware-grid a {
  display: block;
  text-align: center;
  padding: 5px 0;
  text-decoration: none;
  color: inherit;
  border-radius: 4px;
}

.groupware-grid a:hover {
  text-decoration: underline;
}

.groupware-grid a img {
  display: block;
  width: 40px;
  height: 40px;
  margin: 0 auto 8px;
  border-radius: 4px;
}

.groupware-grid a span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
}

.counts {
  display: flex;
  padding: 8px 12px;
  background: var(--gray-background);
  border-radius: 4px;
  margin-bottom: 10px;
}

.counts a {
  display: flex;
  flex-direction: column-reverse;
  align-items: baseline;
  color: inherit;
  font-weight: 500;
  text-decoration: none;
  padding: 0 0px;
}

.counts a:hover {
  color: var(--link-color);
}

.counts a .number {
  font-size: 16px;
  margin-right: 4px;
  letter-spacing: 2px;
}

.counts a .label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.sidebar-md h2 {
  font-size: 14px;
}

.sidebar-md h3 {
  font-size: 13px;
}

.sidebar-md h4 {
  font-size: 12px;
}

.sidebar-md a {
  text-decoration: none;
  color: var(--link-color);
}

.sidebar-md a:hover {
  text-decoration: underline;
}

.sidebar-md blockquote {
  border-left: 5px solid var(--gray-background);
  padding: 1px 1em;
  margin-left: 0;
}

.sidebar-md pre {
  background: #f3f3f7;
  padding: 1em;
  overflow: auto;
  max-width: 100%;
}

.sidebar-md code {
  background: #f3f3f7;
  padding: 0 4px;
}

.sidebar-md hr {
  border: 0;
  border-top: 1px solid #ccd;
}

.sidebar-md table {
  margin: 1em 0;
  width: 100%;
  border-collapse: collapse;
}

.sidebar-md table th {
  background: var(--gray-background);
}

.sidebar-md table th,
.sidebar-md table td {
  border: 1px solid #ccd;
  padding: 5px;
}
`
export default cssStr
