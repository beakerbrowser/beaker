import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import commonCSS from 'beaker://app-stdlib/css/common.css.js'
import buttonsCSS from 'beaker://app-stdlib/css/buttons2.css.js'
import tooltipCSS from 'beaker://app-stdlib/css/tooltip.css.js'

const cssStr = css`
${commonCSS}
${buttonsCSS}
${tooltipCSS}

:host {
  display: block;
  padding: 0 15px;
}

.hidden {
  display: none !important;
}

header {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-gap: 14px;
  max-width: 1000px;
  margin: 50px auto;
}

header .search-ctrl {
  position: relative;
}

header .search-ctrl .fa-search {
  position: absolute;
  font-size: 15px;
  top: 14px;
  left: 18px;
  color: #99a;
}

header .search-ctrl input {
  background: #fff;
  box-sizing: border-box;
  width: 100%;
  height: 40px;
  font-size: 14px;
  letter-spacing: 0.5px;
  font-weight: 500;
  padding: 0 0 0 42px;
  border: 1px solid #dde;
  border-radius: 24px;
  box-shadow: 0 1px 2px #0001;
}

header .search-ctrl input::placeholder {
  letter-spacing: 1px;
  font-size: 14px;
  font-weight: 400;
}

header img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.files {
  display: grid;
  margin: 0 auto;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  grid-gap: 15px;
  width: 100%;
  max-width: 1000px;
  user-select: none;
}

.file {
  cursor: pointer;
  position: relative;
  border-radius: 3px;
  color: inherit;
  border-radius: 3px;
  overflow: hidden;
  user-select: none;
  min-height: 100px;
}

.file:hover {
  text-decoration: none;
}

.file .thumb {
  display: block;
  margin: 0 auto;
  border-radius: 4px;
  width: 180px;
  height: 120px;
  object-fit: cover;
  object-position: top center;
  border: 1px solid #ccd;
}

.file:hover .thumb {
  border-color: #889;
}

.file .details {
  padding: 10px 2px 20px;
}

.file .details > * {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file .title {
  font-size: 12px;
  line-height: 20px;
  text-align: center;
}

.file.add span {
  position: absolute;
  left: 50%;
  top: 40%;
  transform: translate(-50%, -50%);
  font-size: 22px;
  color: rgba(0, 0, 150, 0.15);
}

.file.add:hover span {
  color: rgba(0, 0, 150, 0.25);
}

nav {
  display: flex;
  max-width: 1000px;
  margin: 30px auto 0px;
}

nav a {
  font-size: 14px;
  font-weight: 400;
  letter-spacing: 0.5px;
  color: #889;
  cursor: pointer;
  padding: 4px 10px;
  margin: 0 10px;
  border-radius: 24px;
}

nav a:hover,
nav a.active {
  background: #f0f0f6;
  color: #445;
}

nav .new-btn {
  margin-left: auto;
  color: #556;
}

nav .new-btn .fas {
  font-size: 13px;
  margin-left: 4px;
}

drives-view,
bookmarks-view,
address-book-view {
  display: block;
  max-width: 1000px;
  margin: 26px auto;
}

`
export default cssStr