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
  max-width: 1300px;
  margin: 0 auto;
}

nav, main {
  height: 100vh;
  overflow: auto;
  border-right: 1px solid var(--border-color--light);
}

nav {
  border-left: 1px solid var(--border-color--light);
}

.brand {
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--border-color--light);
  padding: 8px 10px;
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--bg-color--default);
}

.brand h1 {
  margin: 0 auto 0 0;
}

.brand button {
  margin-left: 2px;
}

.empty {
  display: flex;
  justify-content: center;
  flex-direction: column;
  padding: 0px 50px;
  font-size: 32px;
  height: 90vh;
}

.empty > * {
  margin: 5px 0;
}
`
export default cssStr