import {css} from '../../vendor/lit-element/lit-element.js'

const cssStr = css`
:host {
  display: block;
  position: relative;
}

.md {
  display: block;
  padding: 16px 18px;
  margin-bottom: 10px;
  background: var(--header-background);
}

.hide-btn {
  position: absolute;
  top: 5px;
  right: 12px;
  color: rgba(0,0,0,.5);
}

.md > :first-child {
  margin-top: 0;
}

.md > :last-child {
  margin-bottom: 0;
}

a {
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

blockquote {
  border-left: 5px solid var(--header-background);
  padding: 1px 1em;
  margin-left: 0;
}

pre {
  background: #f3f3f7;
  padding: 1em;
  overflow: auto;
  max-width: 100%;
}

code {
  background: #f3f3f7;
  padding: 0 4px;
}

hr {
  border: 0;
  border-top: 1px solid #ccd;
}

table {
  margin: 1em 0;
  width: 100%;
  border-collapse: collapse;
}

table th {
  background: var(--header-background);
}

table th,
table td {
  border: 1px solid #ccd;
  padding: 5px;
}
`
export default cssStr
