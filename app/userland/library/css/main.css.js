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
  display: flex;
  padding-left: 200px;
  min-height: 100vh;
  background: #fafafd;
}

a {
  color: var(--blue);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

nav {
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 200px;
  border-right: 1px solid #ccd;
  white-space: nowrap;
}

main {
  flex: 1;
  max-width: 800px;
  background: #fff;
}

section {
}

nav .top-ctrl {
  display: flex;
  align-items: center;
  background: rgba(0,0,16,0.1);
  padding: 2px 8px;
  border-radius: 4px;
  margin: 10px 10px;
}

nav .top-ctrl input {
  flex: 1;
  margin-right: 5px;
  height: 24px;
  border: 0;
  background: none;
  box-shadow: none;
}

nav .categories {
  margin: 5px 0;
}

nav .categories h4 {
  margin: 16px 8px 4px;
  font-weight: 500;
  color: #0059;
  font-size: 12px;
}

nav .categories a {
  display: block;
  position: relative;
  padding: 8px 16px;
  font-weight: 400;
  letter-spacing: 0.35px;
  color: #223;
  user-select: none;
  cursor: pointer;
}

nav .categories a:hover {
  text-decoration: none;
}

nav .categories a.selected {
  background: rgba(0,0,16,0.05);
}

nav .categories a .fa-fw {
  background: rgba(0,0,80,0.1);
  color: #333;
  padding: 6px;
  border-radius: 4px;
  font-size: 9px;
  margin-right: 4px;
}

nav .categories a.selected .fa-fw {
  background: rgba(0,0,80,0.12);
}

/*nav .categories a .fa-fw.fa-desktop {
  background: linear-gradient(#E91E63, #9C27B0);
  color: #fff;
}

nav .categories a .fa-fw.fa-folder-open {
  background: linear-gradient(rgb(156, 39, 176), #3F51B5);
  color: #fff;
}

nav .categories a .fa-fw.fa-users {
  background: linear-gradient(#8BC34A, #4CAF50);
  color: #fff;
}

nav .categories a .fa-fw.fa-user {
  background: linear-gradient(#4CAF50, #009688);
  color: #fff;
}

nav .categories a .fa-fw.fa-cube {
  background: linear-gradient(#FFC107, #FF9800);
  color: #fff;
}

nav .categories a .fa-fw.fa-code {
  background: linear-gradient(rgb(255, 152, 0), #FF5722);
  color: #fff;
}

nav .categories a .fa-fw.fa-terminal {
  background: linear-gradient(#444, #333);
  color: #fff;
}*/

.drives {
  font-size: 13px;
  padding-top: 6px;
  min-height: 100vh;
  box-sizing: border-box;
  border-right: 1px solid #ccd;
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
  display: flex;
  padding: 18px 24px;
  color: #555;
  border-bottom: 1px solid #eef;
}

.drive .thumb {
  display: block;
  width: 140px;
  height: 100px;
  margin-right: 20px;
  border-radius: 4px;
  border: 1px solid #bbc;
  object-fit: cover;
  object-position: center center;
}

.drive .thumb:hover {
  border-color: #99a;
}

.drive .info {
  flex: 1;
}

.drive .ctrls {
  float: right;
}

.drive .title {
  font-size: 18px;
  font-weight: bold;
  padding: 4px 0;
}

.drive .title a {
  color: inherit;
}

.drive .title .fa-fw {
  margin-right: 3px;
}

.drive .group {
}

.drive .details {
  display: flex;
}

.drive .details > * {
  padding: 4px 4px 4px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.drive .type {
  letter-spacing: -0.2px;
  color: green;
  overflow: visible;
}

.drive .description {
  letter-spacing: -0.2px;
}

.drive .host-toggle {
  color: inherit;
  cursor: pointer;
}

.drive .host-toggle:hover {
  text-decoration: none;
}

.drive .host-toggle:hover span:last-child {
  text-decoration: underline;
}

.forks {
  position: relative;
}

.forks:before {
  content: '';
  display: block;
  position: absolute;
  top: -20px;
  left: 60px;
  width: 1px;
  height: calc(100% - 68px);
  background: #bbc;
}

.forks .drive {
  position: relative;
  padding-left: 100px;
}

.forks .drive:before {
  content: '';
  display: block;
  position: absolute;
  top: 50px;
  left: 60px;
  width: 40px;
  height: 1px;
  background: #bbc;
}

.fork-label {
  display: inline-block;
  padding: 1px 5px;
  background: #4CAF50;
  color: #fff;
  text-shadow: 0 1px 0px #0004;
  border-radius: 4px;
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