import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import buttonsCSS from 'beaker://app-stdlib/css/buttons2.css.js'
import inputsCSS from 'beaker://app-stdlib/css/inputs.css.js'
import tooltipCSS from 'beaker://app-stdlib/css/tooltip.css.js'
import spinnerCSS from 'beaker://app-stdlib/css/com/spinner.css.js'

const cssStr = css`
${buttonsCSS}
${inputsCSS}
${tooltipCSS}
${spinnerCSS}

:host {
  display: block;
}

iframe {
  border: 0;
  width: 100%;
  height: calc(100vh - 133px);
}

a {
  text-decoration: none;
  cursor: initial;
}

a[href]:hover {
  text-decoration: underline;
  cursor: pointer;
}

.results {
  font-size: 13px;
  box-sizing: border-box;
  user-select: none;
}

.results .empty {
  font-size: 16px;
  letter-spacing: 0.7px;
  color: var(--text-color--light);
  padding: 120px 0px;
  background: var(--bg-color--light);
  text-align: center;
}

.results .empty .fas {
  font-size: 120px;
  margin-bottom: 10px;
  color: var(--text-color--light);
}

:host(.top-border) .row:first-child {
  border-top: 1px solid var(--border-color--light);
}

.row {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  color: var(--text-color--lightish);
  border-bottom: 1px solid var(--border-color--light);
}

.row:hover {
  text-decoration: none !important;
  background: var(--bg-color--light);
}
`
export default cssStr