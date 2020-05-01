import {css} from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import colorsCSS from '../../../app-stdlib/css/colors.css.js'
import buttonsCSS from '../../../app-stdlib/css/buttons2.css.js'

const cssStr = css`
${colorsCSS}
${buttonsCSS}

:host {
  display: block;
  height: calc(100vh - 2px);
  width: calc(100vw - 220px);
  overflow: auto;
}

.stats {
  margin-bottom: 10px;
}

.stats table {
  width: 100%;
}

.stats th {
  width: 100px;
  min-width: 100px; /* stop table layout from compressing */
  vertical-align: top;
  text-align: left;
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