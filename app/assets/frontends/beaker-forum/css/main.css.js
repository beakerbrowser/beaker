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
  padding: 0 10px;
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
  grid-template-columns: minmax(0, 1fr) 340px;
  grid-gap: 50px;
}

.layout.split-col {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  grid-gap: 10px;
}

.layout.three-col {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr) 340px;
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
  display: flex;
  align-items: center;
  letter-spacing: 0.75px;
  height: 52px;
  background: var(--header-background);
  color: var(--header-color);
  padding: 0 20px 0 10px;
  margin-bottom: 10px;
}

header a {
  display: block;
  color: inherit;
  font-weight: 500;
  text-decoration: none;
  font-size: 14px;
  padding: 2px 0;
  margin-right: 14px;
}

header a:last-child {
  margin-right: 0px;
}

header a:hover {
  color: var(--link-color);
}

header .brand {
  display: flex;
  align-items: center;
  font-family: "Segoe UI", Ubuntu, Cantarell, "Oxygen Sans", "Helvetica Neue", sans-serif;
  font-size: 23px;
  line-height: 1;
}

header .brand img {
  display: block;
  margin: 0 10px 0 4px;
  width: 38px;
  height: 38px;
  object-fit: cover;
  border-radius: 50%;
}

header .avatar {
  width: 38px;
  height: 38px;
  object-fit: cover;
  border-radius: 50%;
}

header .circle-btn {
  position: relative;
  display: block;
  box-sizing: border-box;
  padding: 0;
  line-height: 26px;
  font-size: 18px;
  text-align: center;
  color: var(--header-notifications-color);
}

header .circle-btn:hover {
  color: var(--link-color);
}

header .circle-btn.highlighted {
}

header .circle-btn small {
  position: absolute;
  right: -1px;
  top: 0px;
  color: var(--header-notifications-color--highlighted);
  line-height: 1;
  font-size: 8px;
}

header beaker-search-input {
  --input-bg-color: var(--header-search-background);
  --input-color: var(--header-search-color);
  --input-border: 1px solid var(--header-search-border-color);
}

header .compose-btn {
  background: var(--button-background--primary);
  color: var(--button-color--primary);
  border-radius: 20px;
  font-size: 12px;
  padding: 6px 14px;
  font-weight: normal;
}

header .compose-btn:hover {
  background: var(--button-background--primary--hover);
  color: var(--button-color--primary--hover);
}

header .logout {
  cursor: pointer;
  color: var(--header-search-color);
}

header .spacer {
  flex: 1;
}

nav.pills {
  display: flex;
  padding-left: 8px;
  margin: 0 0 10px;
  font-size: 13px;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #ccd;
}

nav.pills a {
  padding: 6px 16px;
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
  margin-right: 4px;
  color: inherit;
  text-decoration: none;
}

nav.pills a:hover {
  cursor: pointer;
  background: #f0f0f8;
}

nav.pills a.selected {
  position: relative;
  border: 1px solid #ccd;
  border-bottom: 0;
  background: #fff;
}

nav.pills a.selected:after {
  content: '';
  display: block;
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background: #fff;
}

.flash-message {
  padding: 20px;
  background: #C5E1A5;
  color: #113113;
  font-size: 15px;
  border-radius: 4px;
  margin: 20px 10px 20px;
}

.flash-message > :first-child {
  margin-top: 0;
}

.flash-message > :last-child {
  margin-bottom: 0;
}

.flash-message h2 {
  color: #1b3e0e;
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
  max-width: 640px;
}

.flash-message a.copy-btn:hover {
  box-shadow: 0 2px 4px #0002;
}

@media(max-width: 840px) {
  header beaker-search-input {
    display: none;
  }
}

`
export default cssStr