import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import buttonsCSS from 'beaker://app-stdlib/css/buttons2.css.js'
import inputsCSS from 'beaker://app-stdlib/css/inputs.css.js'
import tooltipCSS from 'beaker://app-stdlib/css/tooltip.css.js'
import spinnerCSS from 'beaker://app-stdlib/css/com/spinner.css.js'

const cssStr = css`
${buttonsCSS}
${inputsCSS}
${tooltipCSS}
${spinnerCSS}

:host {
  min-height: 100vh;
  background: #fff;
}

a {
  color: var(--blue);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

header {
  display: grid;
  grid-template-columns: 200px 1fr 100px;
  padding: 10px;
  position: sticky;
  top: 0;
  z-index: 1;
  background: #fff;
  border-bottom: 1px solid #dde;
}

header .brand {
  font-size: 18px;
  line-height: 35px;
  padding-left: 7px;
  color: #556;
}

header .brand .fas {
  margin-right: 2px;
  font-size: 17px;
  color: #2196F3;
}

header .search-ctrl {
  position: relative;
}

header .search-ctrl .fa-search {
  position: absolute;
  left: 14px;
  top: 11px;
  font-size: 16px;
  color: #bbc;
}

header .search-ctrl input {
  background: #f6f6fa;
  box-sizing: border-box;
  width: 100%;
  max-width: 800px;
  height: 36px;
  padding: 0 0 0 42px;
  border: 0;
  border-radius: 6px;
  box-shadow: none;
}

header .search-ctrl input::placeholder {
  letter-spacing: 1px;
}

header .new-btn {
  display: block;
  background: #fff;
  border: 1px solid #ccd;
  border-top: 1px solid #2196F3;
  color: #667;
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  border-radius: 4px;
  height: 32px;
  line-height: 32px;
  margin: 0 10px;
  padding-right: 4px;
  cursor: pointer;
}

header .new-btn .fa-fw {
  font-size: 12px;
}

header .new-btn.pressed,
header .new-btn:hover {
  background: #fafafd;
  text-decoration: none;
}

.layout {
  display: grid;
  grid-template-columns: 200px 1fr;
}

nav {

}

nav .page-nav a {
  display: block;
  padding: 10px 20px;
  color: #556;
  margin: 10px;
  border-radius: 26px;
  font-weight: 500;
  letter-spacing: 0.5px;
}

nav .page-nav a:hover {
  background: #f3f3f8;
  cursor: pointer;
  text-decoration: none;
}

nav .page-nav a.current {
  background: #E3F2FD;
  color: #2187f3;
  font-weight: bold;
}

nav .page-nav a .fa-fw {
  margin-right: 5px;
}

main {
  max-height: calc(100vh - 58px);
  overflow-y: auto;
}

.drives {
  font-size: 13px;
  min-height: 100vh;
  box-sizing: border-box;
}

.drives header {
  display: flex;
  align-items: center;
  margin-top: -6px;
  padding: 8px;
  color: #556;
  background: #f3f3f7;
  font-size: 14px;
}

.drives header > * {
  margin-right: 8px;
}

.drives .empty {
  font-size: 17px;
  letter-spacing: 0.75px;
  color: #667;
  padding: 28px 40px;
}

.drive {
  position: relative;
  display: flex;
  align-items: center;
  padding: 18px 24px;
  color: #555;
  border-bottom: 1px solid #dde;
}

.drive a {
  color: #99a;
  font-weight: 600;
  cursor: pointer;
  letter-spacing: -0.5px;
}

.drive .thumb {
  display: block;
  width: 32x;
  height: 32px;
  margin-right: 20px;
}

.drive .thumb:hover {
  border-color: #99a;
}

.drive .info {
  flex: 5;
}

.drive .info .title {
  font-size: 15px;
  line-height: 1;
}

.drive .info .title a {
  font-weight: 500;
  letter-spacing: 0.5px;
  color: #333;
}

.drive .info .title .fa-fw {
  margin-right: 3px;
}

.drive .info .description {
  letter-spacing: -0.2px;
}

.drive .forks {
  flex: 1;
  min-width: 100px;
}

.drive .peers {
  flex: 1;
  min-width: 90px;
}

.drive .ctrls {
  width: 40px;
}

.drive .fa-share-alt {
  position: relative;
  top: -1px;
  font-size: 9px;
}

.drive .fa-code-branch {
  position: relative;
  top: -1px;
  font-size: 10px;
}

.drive .type {
  letter-spacing: -0.2px;
  color: green;
  overflow: visible;
}

.forks-container {
  position: relative;
  border-left: 40px solid #f3f3f8;
}

/*
.forks:before {
  content: '';
  display: block;
  position: absolute;
  top: -20px;
  left: 42px;
  width: 1px;
  height: calc(100% - 18px);
  background: #ccd;
}

.forks .drive {
  position: relative;
}

.forks .drive:before {
  content: '';
  display: block;
  position: absolute;
  top: 34px;
  left: 42px;
  width: 36px;
  height: 1px;
  background: #ccd;
}*/

.fork-label {
  display: inline-block;
  padding: 1px 5px;
  background: #4CAF50;
  color: #fff;
  text-shadow: 0 1px 0px #0004;
  border-radius: 4px;
  font-size: 10px;
}

.help {
  max-width: 350px;
  line-height: 1.4;
  margin: 24px;
  background: #fafafd;
  border-radius: 8px;
  letter-spacing: 0.2px;
  color: #778;
}

.help > :first-child {
  margin-top: 0;
}

.help > :last-child {
  margin-bottom: 0;
}

.help kbd {
  background: #223;
  color: #fff;
  font-family: var(--code-font);
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 0.7rem;
}

@media (max-width: 1100px) {
  .help {
    display: none;
  }
}

`
export default cssStr