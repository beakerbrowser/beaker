import {css} from '../../app-stdlib/vendor/lit-element/lit-element.js'
import colorsCSS from '../../app-stdlib/css/colors.css.js'

const cssStr = css`
${colorsCSS}

:host {
  display: inline-block;
  background: #eee;
  padding: 6px 10px;
  border-radius: 16px;
  cursor: pointer;
}
`
export default cssStr