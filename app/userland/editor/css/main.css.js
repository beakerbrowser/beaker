import {css} from '../../app-stdlib/vendor/lit-element/lit-element.js'
import buttonsCSS from '../../app-stdlib/css/buttons2.css.js'
import toolbarCSS from './toolbar.css.js'
import tooltipCSS from '../../app-stdlib/css/tooltip.css.js'

const cssStr = css`
${buttonsCSS}
${toolbarCSS}
${tooltipCSS}

:host {
  --default: #eef;
  --background: #223;
  
  display: block;
  background: var(--background);
  color: var(--default);
}

a {
  color: #b4b4ff;
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
  background: var(--background);
}

:host(.files-open) {
  padding-left: 200px;
}

.close-btn {
  display: none;
  position: fixed;
  top: 2px;
  right: 2px;
  background: transparent;
  border: 0;
  color: var(--default);
  cursor: pointer;
}
.close-btn:hover {
  background: transparent;
}
:host(.sidebar) .close-btn {
  display: inline;
}
`
export default cssStr