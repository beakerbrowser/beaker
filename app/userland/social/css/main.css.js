import {css} from '../vendor/lit-element/lit-element.js'
import emptyCSS from './com/empty.css.js'
import spinnerCSS from './com/spinner.css.js'
import tooltipCSS from './com/tooltip.css.js'

const cssStr = css`
${emptyCSS}
${spinnerCSS}
${tooltipCSS}

:host {
  display: block;
}

.layout {
  margin: 0 auto;
}

.layout.narrow {
  max-width: 640px;
}

.layout.left-col {
  display: grid;
  grid-template-columns: 240px 1fr;
  grid-gap: 10px;
}

.layout.right-col {
  display: grid;
  grid-template-columns: 1fr 240px;
  grid-gap: 10px;
}

.layout.split-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-gap: 10px;
}

@media (max-width: 900px) {
  .layout.right-col {
    grid-template-columns: 1fr;
  }
  .layout.right-col > :last-child {
    display: none;
  }
}

header {
  display: flex;
  align-items: center;
  margin: 10px 6px 10px;
  letter-spacing: 0.75px;
}

header a {
  display: block;
  color: #556;
  font-weight: 500;
  text-decoration: none;
  font-size: 14px;
  padding: 2px 0;
  margin-right: 20px;
}

header a:last-child {
  margin-right: 0px;
}

header a:hover {
  color: var(--blue);
}
header a.highlighted {
  color: var(--red);
}

header .brand {
  position: relative;
  padding-left: 20px;
}

header .logo {
  position: absolute;
  top: 3px;
  left: 0;
  width: 16px;
  height: 16px;
}

header .spacer {
  flex: 1;
}

nav.pills {
  display: flex;
  margin: 0 0 10px;
  font-size: 13px;
  letter-spacing: 0.5px;
}

nav.pills a {
  padding: 6px 16px;
  border-radius: 4px;
  margin-right: 4px;
  color: inherit;
  text-decoration: none;
}

nav.pills a.selected,
nav.pills a:hover {
  cursor: pointer;
  background: #eaeaf3;
}

`
export default cssStr