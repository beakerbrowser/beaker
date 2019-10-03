import {css} from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import buttonsCSS from '../../../app-stdlib/css/buttons2.css.js'
import toolbarCSS from '../toolbar.css.js'
import tooltipCSS from '../../../app-stdlib/css/tooltip.css.js'

const cssStr = css`
${buttonsCSS}
${toolbarCSS}
${tooltipCSS}

:host {
  display: block;
  background: #222;
  color: #eee;
}

.empty {
  padding: 10px;
}

.divider {
  border-left: 1px solid rgba(255, 255, 255, .4);
  height: 21px;
}

files-explorer {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 200px;
  z-index: 1;
  background: #222;
}

:host(.files-open) {
  padding-left: 200px;
}
`
export default cssStr