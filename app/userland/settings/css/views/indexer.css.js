import {css} from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import colorsCSS from '../../../app-stdlib/css/colors.css.js'
import buttonsCSS from '../../../app-stdlib/css/buttons2.css.js'
import tooltipCSS from '../../../app-stdlib/css/tooltip.css.js'
import spinnerCSS from '../../../app-stdlib/css/com/spinner.css.js'

const cssStr = css`
${colorsCSS}
${buttonsCSS}
${tooltipCSS}
${spinnerCSS}

:host {
  display: block;
}

a {
  color: var(--blue);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

h2 small {
  color: var(--text-color--pretty-light);
}

section.twocol {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-gap: 10px;
}

.sites-list {
  border: 1px solid var(--border-color--default);
  border-radius: 4px;
}

.sites-list.fixed-height {
  height: 100px;
  overflow: auto;
}

.sites-list > div {
  display: flex;
  padding: 6px 2px;
  border-bottom: 1px solid var(--border-color--light);
}

.sites-list > div:last-child {
  border-bottom: 0;
}

.sites-list > div > * {
  border-right: 1px solid var(--border-color--light);
  padding: 0px 6px;
  font-variant: tabular-nums;
}

.sites-list > div .url { flex: 0 0 120px; }
.sites-list > div .version { flex: 0 0 50px; }
.sites-list > div .last-index { flex: 0 0 220px; }

.sites-list > div > :last-child {
  flex: 1;
  border: 0;
}
`
export default cssStr
