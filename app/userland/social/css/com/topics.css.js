import {css} from '../../vendor/lit-element/lit-element.js'
import spinnerCSS from './spinner.css.js'

const cssStr = css`
${spinnerCSS}

:host {
  display: block;
}

a {
  text-decoration: none;
  color: #778;
  font-weight: 500;
}

a:hover {
  color: var(--blue);
}

p {
  margin: 12px 0;
}
`
export default cssStr
