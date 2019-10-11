import {css} from '../vendor/lit-element/lit-element.js'
import resetcss from './reset.css.js'
import typographycss from './typography.css.js'
import buttonscss from './buttons.css.js'
import inputscss from './inputs.css.js'
const cssStr = css`
${resetcss}
${typographycss}
${buttonscss}
${inputscss}

body {
  background: #f5f5f7;
  color: #333;
}
`
export default cssStr
