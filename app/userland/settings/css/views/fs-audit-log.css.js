import {css} from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import colorsCSS from '../../../app-stdlib/css/colors.css.js'
import buttonsCSS from '../../../app-stdlib/css/buttons2.css.js'

const cssStr = css`
${colorsCSS}
${buttonsCSS}

:host {
  display: block;
  height: 100vh;
  overflow: auto;
}

.logger thead th {
  position: sticky;
  top: 0;
  text-align: left;
  background: #f5f5fa;
}

.logger .logger-row > * {
  white-space: nowrap;
  border: 1px solid #dde;
}

.logger .logger-row td {
  padding: 4px;
}

.logger .logger-row:hover {
  background: #f5f5f5;
}

.logger .logger-row small {
  color: rgba(0, 0, 0, 0.5);
}
`
export default cssStr