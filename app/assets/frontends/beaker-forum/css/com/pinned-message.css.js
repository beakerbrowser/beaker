import {css} from '../../vendor/lit-element/lit-element.js'

const cssStr = css`
:host {
  display: block;
  position: relative;
}

.md {
  display: block;
  padding: 20px 24px 22px;
  margin-bottom: 10px;
  background: var(--body-background);
  border: 1px solid var(--button-border-color);
  border-radius: 4px;
  box-shadow: 0 1px 2px #0001;
}

.hide-btn {
  position: absolute;
  top: 6px;
  right: 10px;
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
  color: var(--link-color);
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
