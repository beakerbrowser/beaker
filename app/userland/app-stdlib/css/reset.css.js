import {css} from '../vendor/lit-element/lit-element.js'

const cssStr = css`
*,
*:before,
*:after {
  box-sizing: border-box;
}

body {
  margin: 0;
}

a {
  text-decoration: none;
  color: inherit;
}

button {
  background: none;
  outline-color: transparent;
  border: none;
}

`
export default cssStr
