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

.header .author {
  font-weight: 500;
  color: inherit;
}

.header .name {
  margin-right: 5px;
  color: inherit;
}

.readme {
  margin: 4px 0 8px;
  padding: 14px;
  background: var(--bg-color--light);
  border-radius: 8px;
}

.add-readme-link {
  color: rgba(0,0,0,.4);
  text-decoration: none;
}

.add-readme-link:hover {
  text-decoration: underline;
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