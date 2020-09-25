import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import commonCSS from 'beaker://app-stdlib/css/common.css.js'
import buttonsCSS from 'beaker://app-stdlib/css/buttons2.css.js'
import tooltipCSS from 'beaker://app-stdlib/css/tooltip.css.js'
import spinnerCSS from 'beaker://app-stdlib/css/com/spinner.css.js'

const cssStr = css`
${commonCSS}
${buttonsCSS}
${tooltipCSS}
${spinnerCSS}

:host {
  display: grid;
  grid-template-columns: 1fr 3fr;
}

nav, main {
  height: 100vh;
  overflow: auto;
}

nav {
  border-right: 1px solid var(--border-color--light);
}

.brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-color--light);
  padding: 8px 10px;
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--bg-color--default);
}

.brand h1 {
  margin: 0;
}
`
export default cssStr