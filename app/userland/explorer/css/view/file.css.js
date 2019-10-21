import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'

const cssStr = css`
:host {
  display: block;
}

a {
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

.header {
  margin: 8px 0 10px;
  font-size: 12px;
  color: #556;
}

.header img {
  display: inline-block;
  object-fit: cover;
  width: 24px;
  height: 24px;
  vertical-align: middle;
  position: relative;
  top: -1px;
  margin-right: 3px;
  border-radius: 50%;
}

.header .date {
  color: #99a;
}

.header .author {
  font-weight: 500;
  color: inherit;
}

.header .name {
  margin-right: 5px;
  color: inherit;
}

.content {
  margin: 10px 0px 14px;
  padding: 14px;
  background: var(--bg-color--light);
  border-radius: 8px;
}

file-display {
  --text-padding: 14px 14px 18px;
  --text-background: #fff;
  --text-max-width: 60em;
}

social-signals {
  margin: 4px 0px;
}
`
export default cssStr