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
  position: relative;
  background: var(--bg-color--light);
}

beaker-resource {
  display: block;
  position: relative;
  margin: 0 0 6px;
  padding: 0 0 0 14px;
  border: 1px solid transparent;
}

.main-thread beaker-resource::before,
.main-thread beaker-resource::after {
  content: '';
  position: absolute;
  z-index: 1;
  left: 27px;
  width: 3px;
  background: var(--border-color--light);
}

.main-thread beaker-resource::before {
  top: -8px;
  height: 8px;
}

.main-thread beaker-resource::after {
  top: 46px;
  height: calc(100% - 46px);
}

.main-thread beaker-resource:first-of-type::before {
  display: none;
}

.main-thread beaker-resource:last-of-type::after {
  display: none;
}

.main-thread beaker-resource.highlighted {
  padding: 0 10px;
  background: var(--bg-color--default);
  border: 1px solid var(--border-color--light);
  border-radius: 4px;
}

.main-thread beaker-resource.highlighted::before,
.main-thread beaker-resource.highlighted::after {
  display: none;
}

.main-thread beaker-resource.highlighted + beaker-resource::before {
  top: -4px;
  height: 8px;
}
`
export default cssStr