import {css} from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import colorsCSS from '../../../app-stdlib/css/colors.css.js'

const cssStr = css`
${colorsCSS}

:host {
  display: flex;
}

a {
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 3px;
  margin-right: 5px;
}

a:hover {
  background: #f0f0f5;
}

a.current {
  background: #f0f0f5;
}
`
export default cssStr