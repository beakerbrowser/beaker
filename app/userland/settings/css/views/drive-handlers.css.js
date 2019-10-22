import {css} from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import colorsCSS from '../../../app-stdlib/css/colors.css.js'
import buttonsCSS from '../../../app-stdlib/css/buttons2.css.js'
import tooltipCSS from '../../../app-stdlib/css/tooltip.css.js'
import emptyCSS from '../empty.css.js'

const cssStr = css`
${colorsCSS}
${buttonsCSS}
${tooltipCSS}
${emptyCSS}

:host {
  display: block;
}

a {
  color: var(--blue);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

table {
  border-collapse: collapse;
}

td {
  border: 1px solid #ccd;
  padding: 8px 12px;
}

td strong {
  font-weight: 500;
}

td small {
  color: #889;
}
`
export default cssStr