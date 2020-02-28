import {css} from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import colorsCSS from '../../../app-stdlib/css/colors.css.js'
import buttonsCSS from '../../../app-stdlib/css/buttons2.css.js'
import tooltipCSS from '../../../app-stdlib/css/tooltip.css.js'
import spinnerCSS from '../../../app-stdlib/css/com/spinner.css.js'

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

.section.warning {
  color: red;
  background: #ffdddd;
  border: 1px solid transparent;
  padding: 0 10px;
  border-radius: 4px;
  margin: 10px 0;
}

.section.warning button {
  color: rgb(255, 255, 255);
  background: rgb(255, 59, 48);
  border: 0;
}

.section.warning button .spinner {
  border-color: #fff !important;
  border-right-color: transparent !important;
}
`
export default cssStr