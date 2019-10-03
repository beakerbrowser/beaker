import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import buttonsCSS from 'beaker://app-stdlib/css/buttons2.css.js'
import inputsCSS from 'beaker://app-stdlib/css/inputs.css.js'
import tooltipCSS from 'beaker://app-stdlib/css/tooltip.css.js'

const cssStr = css`
${buttonsCSS}
${inputsCSS}
${tooltipCSS}

:host {
  display: grid;
  grid-template-columns: 1fr 400px;
  grid-gap: 30px;
  height: 100%;
  padding: 10px;
}

file-display {
  display: block;
  border: 1px solid #e3e3ee;
  border-radius: 8px;
  padding: 10px;
}

@media (max-width: 800px) {
  :host {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }
  folder-info,
  file-info {
    grid-row: 1;
  }
}
`
export default cssStr