import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'

const cssStr = css`
:host {
  display: block;
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