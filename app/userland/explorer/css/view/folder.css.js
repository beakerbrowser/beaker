import {css} from '../../vendor/lit-element/lit-element.js'

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

.readme {
  margin: 4px 0 8px;
  padding: 14px;
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

`
export default cssStr