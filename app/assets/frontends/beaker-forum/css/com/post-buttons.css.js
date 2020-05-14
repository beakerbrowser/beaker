import {css} from '../../vendor/lit-element/lit-element.js'
import buttonscss from '../buttons.css.js'

const cssStr = css`
${buttonscss}

:host {
  display: block;
}

button {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 6px;
  padding: 10px 8px 10px 16px;
  width: 100%;
  text-align: left;
}

button .fa-fw {
  margin-right: 8px;
}
`
export default cssStr
