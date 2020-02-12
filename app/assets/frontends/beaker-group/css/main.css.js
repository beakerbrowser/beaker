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

.banner {
  height: 150px;
  width: 100%;
  background-image: url("/banner"), linear-gradient(to bottom, #3085ef, #425de2);
  background-position: center center;
  background-size: cover;
  background-repeat: no-repeat;
}

header {
  display: flex;
  align-items: center;
  letter-spacing: 0.75px;
  height: 52px;
  background: #f5f5fb;
  color: #556;
  padding: 0 20px 0 10px;
  margin-bottom: 20px;
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
  color: var(--blue);
}

header .brand {
  display: flex;
  align-items: center;
  font-size: 23px;
  line-height: 1;
}

header .brand img {
  display: block;
  margin-right: 10px;
  width: 70px;
  height: 70px;
  object-fit: cover;
  border-radius: 50%;
  border: 5px solid #fff;
}

header .avatar {
  width: 38px;
  height: 38px;
  object-fit: cover;
  border-radius: 50%;
}

header .circle-btn {
  display: block;
  box-sizing: border-box;
  padding: 0;
  width: 28px;
  height: 28px;
  line-height: 26px;
  font-size: 13px;
  text-align: center;
  border-radius: 50%;
  border: 1px solid #aab;
  background: #fff;
  color: #889;
}

header .circle-btn:hover {
  border-color: var(--blue);
}

header .circle-btn.highlighted {
  color: var(--red);
  border-color: var(--red);
}

header beaker-search-input {
  --input-bg-color: #fff;
  --input-border: 1px solid #aab;
}

header .compose-btn {
  background: #4d84f3;
  color: #fff;
  border-radius: 20px;
  font-size: 12px;
  padding: 6px 14px;
  font-weight: normal;
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
}

.flash-message a.copy-btn:hover {
  box-shadow: 0 2px 4px #0002;
}

`
export default cssStr