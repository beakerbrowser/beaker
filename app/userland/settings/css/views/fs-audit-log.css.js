import {css} from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import colorsCSS from '../../../app-stdlib/css/colors.css.js'
import buttonsCSS from '../../../app-stdlib/css/buttons2.css.js'

const cssStr = css`
${colorsCSS}
${buttonsCSS}

:host {
  display: block;
  width: calc(100vw - 250px);
}

a {
  color: var(--blue);
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
  background: var(--bg-color--light);
}

.logger .gap-row td {
  height: 8px;
  background: var(--bg-color--light);
}

.logger .logger-row > * {
  border: 1px solid var(--border-color--light);
}

.logger .logger-row > *:not(.args) {
  white-space: nowrap;
}

.logger .logger-row > .args {
  word-break: break-word;
}

.logger .logger-row.badish {
  background: #fc03;
}

.logger .logger-row.bad {
  background: #f003;
}

.logger .logger-row td {
  padding: 4px;
}

.logger .logger-row:hover {
  background: var(--bg-color--light);
}

.logger .logger-row small {
  color: rgba(0, 0, 0, 0.5);
}
`
export default cssStr