import {css} from '../../app-stdlib/vendor/lit-element/lit-element.js'
import buttonsCSS from '../../app-stdlib/css/buttons2.css.js'
import inputsCSS from '../../app-stdlib/css/inputs.css.js'

const cssStr = css`
${buttonsCSS}
${inputsCSS}

:host {
  display: block;
  overflow-y: auto;
  height: 100vh;
}

nav {
  position: fixed;
  top: 25px;
  left: 15px;
  width: 185px;
  z-index: 1;
}

nav h1 img {
  display: inline-block;
  position: relative;
  top: -2px;
  width: 32px;
  margin-right: 5px;
  vertical-align: middle;
}

nav h1 {
  display: inline-block;
  padding: 5px 15px 2px 5px;
  margin-top: -5px;
  margin-left: -5px;
  font-weight: 500;
}

nav a {
  display: block;
  padding: 4px 16px;
  cursor: pointer;
}

nav a:hover,
nav a.active {
  color: var(--blue);
}

nav a .fas {
  visibility: hidden;
}

nav a.active .fas {
  visibility: visible;
}

main {
  max-width: 700px;
  margin: 20px auto;
}

@media screen and (max-width: 1115px) {
  main {
    margin-left: 200px;
  }
}

.search-container {
  position: relative;
  width: 100%;
  height: 32px;
  z-index: 3;
  margin-bottom: 10px;
}

.search-container .spinner,
.search-container .close-btn,
.search-container .search {
  position: absolute;
}

.search-container i.fa-search {
  position: absolute;
  left: 10px;
  top: 8.75px;
  color: rgba(0, 0, 0, 0.5);
}

.search-container .close-btn {
  right: 7px;
  top: 7px;
}

.search-container input.search {
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  padding: 0 10px;
  padding-left: 28px;
  box-sizing: border-box;
}

.clear-history {
  text-align: right;
  margin-bottom: 10px;
  cursor: pointer;
  color: var(--blue);
}

.clear-history:hover {
  text-decoration: underline;
}

.heading {
  position: sticky;
  top: 0px;
  z-index: 1;
  padding: 5px 0;
  margin: 0;
  background: #f7f7f7;
  border-bottom: 1px solid #e6e6e6;
  margin-bottom: -1px;
  font-weight: 400;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.15px;
  color: rgba(0, 0, 0, 0.75);
}

.heading:not(:first-of-type) {
  margin-top: 40px;
}

.row {
  display: flex;
  align-items: center;
  border: 1px solid #e6e6ea;
  border-top: 0;
  padding: 0 15px;
  height: 40px;
  background: #fff;
}

.row:hover {
  background: #f9f9fa;
}

.row .link {
  display: flex;
  align-items: center;
  text-decoration: none;
  color: #333;
}

.row .favicon {
  display: inline;
  flex-basis: 20px;
  width: 20px;
  height: 20px;
  margin-right: 10px;
}

.row .title {
  max-width: 450px;
  display: inline-block;
  margin-right: 5px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row .url {
  max-width: 200px;
  margin-right: 20px;
  color: #999;
  font-weight: 300;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row .actions {
  margin-left: auto;
  opacity: 0;
}

.row:hover .actions {
  opacity: 1;
}

`
export default cssStr