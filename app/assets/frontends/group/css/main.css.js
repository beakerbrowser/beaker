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
  max-width: 1000px;
  margin: 0 auto;
}

.layout {
  margin: 0 auto;
}

.layout.narrow {
  max-width: 640px;
}

.layout.left-col {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  grid-gap: 10px;
}

.layout.right-col {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 240px;
  grid-gap: 10px;
}

.layout.split-col {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  grid-gap: 10px;
}

.layout.three-col {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr) 240px;
  grid-gap: 10px;
}

@media (max-width: 800px) {
  .layout.right-col {
    grid-template-columns: minmax(0, 1fr);
  }
  .layout.right-col > :last-child {
    display: none;
  }
}

@media (max-width: 1200px) {
  .layout.three-col {
    grid-template-columns: 240px minmax(0, 1fr);
  }
  .layout.three-col > :last-child {
    display: none;
  }
}

header {
}

header > div {
  display: flex;
  align-items: center;
  height: 50px;
  letter-spacing: 0.75px;
}

header .top {
  color: #556;
}

header .bottom {
  color: #556;
}

header a {
  display: block;
  color: inherit;
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
  font-size: 21px;
  line-height: 1;
}

header .compose-btn {
  background: #4d84f3;
  color: #fff;
  border-radius: 20px;
  font-size: 13px;
  padding: 6px 12px;
  font-weight: normal;
  box-shadow: 0 1px 2px #0002;
  border: 1px solid #1447ad;
}


header .compose-btn:hover {
  color: #fff;
  background: #3d74e3;
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

.flash-message {
  padding: 20px;
  background: #C5E1A5;
  color: #1d4820;
  font-size: 15px;
  border-radius: 8px;
  margin: 0 0 30px;
}

.flash-message > :first-child {
  margin-top: 0;
}

.flash-message > :last-child {
  margin-bottom: 0;
}

.flash-message h2 {
  color: #33691E;
}

.flash-message a.copy-btn {
  display: flex;
  justify-content: space-between;
  font-size: 15px;
  background: #fff;
  color: inherit;
  padding: 10px 20px;
  border-radius: 24px;
  box-sizing: border-box;
  color: #556;
  cursor: pointer;
  box-shadow: 0 1px 2px #0002;
  transition: box-shadow 0.2s;
}

.flash-message a.copy-btn:hover {
  box-shadow: 0 2px 4px #0002;
}

`
export default cssStr