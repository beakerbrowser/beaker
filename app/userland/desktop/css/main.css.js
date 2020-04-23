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
  padding: 0 15px 100px;
}

.hidden {
  display: none !important;
}

#topleft {
  position: absolute;
  top: 10px;
  left: 10px;
}

#topright {
  position: absolute;
  top: 10px;
  right: 10px;
}

#topright a {
  margin-left: 6px;
  font-size: 12px;
  opacity: 0.85;
}

#topright a span {
  opacity: 0.8;
  font-size: 11px;
}

.profile-ctrl {
  display: flex;
  align-items: center;
  color: inherit;
}

.profile-ctrl span {
  padding: 0 0 0 8px;
  letter-spacing: 0.4px;
}

.profile-ctrl img {
  display: block;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  object-fit: cover;
}

.files {
  display: grid;
  margin: 100px auto 0;
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
  margin: 20px auto 0px;
}

nav a {
  font-size: 13px;
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

nav .spacer {
  flex: 1;
}

nav .search-ctrl {
  position: relative;
  height: 24px;
}

nav .search-ctrl .fa-search {
  position: absolute;
  z-index: 2;
  top: 7px;
  left: 10px;
  font-size: 12px;
  color: #99a;
}

nav .search-ctrl input {
  position: relative;
  top: -1px;
  z-index: 1;
  background: #fff;
  box-sizing: border-box;
  height: 26px;
  width: 180px;
  font-size: 12px;
  letter-spacing: 0.5px;
  font-weight: 500;
  padding: 0 0 0 26px;
  border: 1px solid #dde;
  border-radius: 24px;
}

nav .new-btn {
  color: #556;
}

nav .new-btn .fas {
  font-size: 13px;
  margin-left: 4px;
}

feed-view {
  display: block;
  max-width: 1000px;
  margin: 26px auto;
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