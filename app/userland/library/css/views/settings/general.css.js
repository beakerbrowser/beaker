import {css} from '../../../../app-stdlib/vendor/lit-element/lit-element.js'
import colorsCSS from '../../../../app-stdlib/css/colors.css.js'
import buttonsCSS from '../../../../app-stdlib/css/buttons2.css.js'
import tooltipCSS from '../../../../app-stdlib/css/tooltip.css.js'
import spinnerCSS from '../../../../app-stdlib/css/com/spinner.css.js'

const cssStr = css`
${colorsCSS}
${buttonsCSS}
${tooltipCSS}
${spinnerCSS}

:host {
  display: block;
  max-width: 600px;
}

a {
  color: var(--blue);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

.section {
  margin-bottom: 30px;
}
`
export default cssStr