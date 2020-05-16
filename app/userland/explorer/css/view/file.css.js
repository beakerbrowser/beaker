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

.content {
  margin: 10px 0px 14px;
  border: 1px solid #ccd;
  border-radius: 4px;
}

file-display {
  --text-padding: 14px 14px 18px;
  --text-background: #fff;
  --text-max-width: 60em;
  --media-padding: 14px 14px 18px;
}

`
export default cssStr