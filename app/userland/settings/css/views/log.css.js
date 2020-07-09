import {css} from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import colorsCSS from '../../../app-stdlib/css/colors.css.js'
import buttonsCSS from '../../../app-stdlib/css/buttons2.css.js'

const cssStr = css`
${colorsCSS}
${buttonsCSS}

:host {
  display: block;
}

.logger .controls {
  position: sticky;
  top: 0;
  background: var(--bg-color--default);
}

.logger .standard-controls {
  display: flex;
  align-items: center;
  color: var(--text-color--lightish);
  padding: 6px 0;
}

.logger .standard-controls input {
  display: none;
}

.logger .standard-controls .spacer {
  flex: 1;
}

.logger .standard-controls .divider {
  margin-left: 20px;
  margin-right: 5px;
  border-right: 1px solid var(--border-color--light);
  height: 14px;
}

.logger .standard-controls .divider.thin {
  margin-left: 5px;
}

.logger .standard-controls label {
  margin-left: 15px;
  margin-bottom: 0;
  font-weight: normal;
}

.logger .standard-controls .status {
  margin-left: 8px;
}

.logger .logger-row td {
  padding: 4px;
  border-top: 1px solid var(--bg-color--default);
}

.logger .logger-row.purple {
  /*background: #fdf3ff;*/
  color: #9C27B0;
}

.logger .logger-row.blue {
  /*background: #e6f4ff;*/
  color: #2196F3;
}

.logger .logger-row.cyan {
  /*background: #e7fcff;*/
  color: #00BCD4;
}

.logger .logger-row.green {
  /*background: #f1f9f1;*/
  color: #4CAF50;
}

.logger .logger-row.yellow {
  /*background: #fff3cc;*/
  color: #FFC107;
}

.logger .logger-row.red {
  /*background: #fddee9;*/
  color: #E91E63;
}

.logger .logger-row:hover {
  background: var(--bg-color--default);
}

.logger .logger-row .msg {
  color: var(--text-color--dark);
}

.logger .logger-row .level,
.logger .logger-row .category,
.logger .logger-row .subcategory,
.logger .logger-row .timestamp {
  white-space: nowrap;
}

.logger .logger-row .level {
  font-weight: 500;
}

.logger .logger-row small {
  color: rgba(0, 0, 0, 0.5);
}
`
export default cssStr