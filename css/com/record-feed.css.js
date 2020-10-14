import {css} from '../../vendor/lit-element/lit-element.js'
import buttonsCSS from '../../css/buttons2.css.js'
import inputsCSS from '../../css/inputs.css.js'
import tooltipCSS from '../../css/tooltip.css.js'
import spinnerCSS from '../../css/com/spinner.css.js'

const cssStr = css`
${buttonsCSS}
${inputsCSS}
${tooltipCSS}
${spinnerCSS}

:host {
  display: block;
  position: relative;
}

a {
  text-decoration: none;
  cursor: initial;
}

a[href]:hover {
  text-decoration: underline;
  cursor: pointer;
}

h2.title {
  font-size: 18px;
  color: var(--text-color--light);
  border-bottom: 1px solid var(--border-color--light);
  margin: 20px 0;
}

h2.results-header {
  margin: 0 0 30px;
  padding: 0 4px 4px;
  text-align: center;
  color: var(--text-color--default);
  box-sizing: border-box;
  font-weight: 500;
  color: var(--text-color--light);
  letter-spacing: 0.7px;
  font-size: 13px;
  border-bottom: 1px solid var(--border-color--light);
}

h2.results-header:not(:first-child) {
  margin-top: 10px;
}

h2.results-header span {
  position: relative;
  top: 11px;
  background: var(--bg-color--default);
  padding: 5px;
}

h2 a:hover {
  cursor: pointer;
  text-decoration: underline;
}

.result + h2 {
  margin-top: 20px;
}

.results {
  font-size: 14px;
  box-sizing: border-box;
}

.results beaker-record {
  display: block;
  margin: var(--beaker-record-feed--default-margin, 10px) 0;
}

.results beaker-record[render-mode="link"] {
  margin: var(--beaker-record-feed--link-margin--grouped, 18px) 0;
}
.results beaker-record:not([render-mode="link"]) + beaker-record[render-mode="link"] {
  margin-top: var(--beaker-record-feed--link-margin, 24px);
}
.results beaker-record[render-mode="link"] + beaker-record:not([render-mode="link"]) {
  margin-top: var(--beaker-record-feed--link-margin, 24px);
}

.results beaker-record[render-mode="expanded-link"] {
  margin: var(--beaker-record-feed--expanded-link-margin, 20px) 0;
}

.results beaker-record[render-mode="action"] {
  margin: var(--beaker-record-feed--action-margin, 16px) 0;
}

.results beaker-record.small[render-mode="action"] {
  margin: var(--beaker-record-feed--small-action-margin, 4px) 0;
}

.results beaker-record[render-mode="comment"] {
  margin: var(--beaker-record-feed--comment-margin--grouped, 10px) 0 var(--beaker-record-feed--comment-margin--grouped, 10px) 45px;
}
.results beaker-record:not([render-mode="comment"]) + beaker-record[render-mode="comment"] {
  margin-top: var(--beaker-record-feed--comment-margin, 24px);
}
.results beaker-record[render-mode="comment"] + beaker-record:not([render-mode="comment"]) {
  margin-top: var(--beaker-record-feed--comment-margin, 24px);
}

.results beaker-record[render-mode="wrapper"] {
  margin: var(--beaker-record-feed--wrapper-margin--grouped, 18px) 0;
}
.results beaker-record:not([render-mode="wrapper"]) + beaker-record[render-mode="wrapper"] {
  margin-top: var(--beaker-record-feed--wrapper-margin, 18px);
}
.results beaker-record[render-mode="wrapper"] + beaker-record:not([render-mode="wrapper"]) {
  margin-top: var(--beaker-record-feed--wrapper-margin, 18px);
}

.empty {
  font-size: 16px;
  letter-spacing: 0.7px;
  color: var(--text-color--light);
  padding: 60px 0px;
  text-align: center;
}

.notification + .result {
  margin-top: 0;
}
.result + .notification {
  margin-top: 15px;
}
`
export default cssStr