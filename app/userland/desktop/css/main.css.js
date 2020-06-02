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
  display: flex;
  align-items: center;
}

#topleft a {
  font-size: 12px;
  margin-right: 10px;
  color: inherit;
  opacity: 0.85;
}

#topleft .profile-ctrl {
  display: inline-flex;
  align-items: center;
  opacity: 1;
}

#topleft .profile-ctrl span {
  padding: 0 0 0 8px;
  opacity: 0.85;
}

#topleft .profile-ctrl img {
  display: block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  object-fit: cover;
}

#topright {
  position: absolute;
  top: 10px;
  right: 10px;
}

#topright a {
  margin-left: 10px;
  font-size: 12px;
  opacity: 0.85;
}

#topright a span {
  opacity: 0.8;
  font-size: 11px;
}

.pins {
  position: relative;
  display: grid;
  margin: 100px auto 0;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  grid-gap: 15px;
  width: 100%;
  max-width: 1000px;
  user-select: none;
}

.pins .add {
  position: absolute;
  left: 0.2em;
  top: -2em;
  font-size: 14px;
  color: rgba(0, 0, 150, 0.35);
  cursor: pointer;
}

.pins .add:hover {
  color: rgba(0, 0, 150, 0.5);
}

.pin {
  cursor: pointer;
  position: relative;
  border-radius: 3px;
  color: inherit;
  border-radius: 3px;
  overflow: hidden;
  user-select: none;
  min-height: 100px;
}

.pin:hover {
  text-decoration: none;
}

.pin .thumb {
  display: block;
  margin: 0 auto;
  border-radius: 4px;
  width: 180px;
  height: 120px;
  object-fit: cover;
  object-position: top center;
  border: 1px solid #bbc;
}

.pin:hover .thumb {
  border-color: #889;
}

.pin .details {
  padding: 10px 2px 20px;
}

.pin .details > * {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pin .title {
  font-size: 12px;
  line-height: 20px;
  text-align: center;
}

nav {
  display: flex;
  max-width: 1000px;
  margin: 20px auto 0px;
}

nav a {
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.5px;
  color: #667;
  cursor: pointer;
  padding: 4px 10px 3px 10px;
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
  border: 1px solid #ccd;
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

recent-view,
drives-view,
bookmarks-view,
address-book-view {
  display: block;
  max-width: 1000px;
  margin: 16px auto;
}

.intro {
  position: relative;
  max-width: 1000px;
  margin: 16px auto;
  text-align: center;
  border: 1px solid #bbc;
  border-radius: 4px;
}

.intro .close {
  position: absolute;
  top: 10px;
  right: 16px;
  font-size: 16px;
}

.intro h3 {
  font-size: 46px;
  font-weight: 500;
  letter-spacing: 0.7px;
  margin-bottom: 0;
}

.intro h4 {
  font-size: 18px;
}

.intro h5 {
  font-size: 17px;
  font-weight: 500;
  margin-bottom: 40px;
}

.intro a {
  color: var(--blue);
  cursor: pointer;
}

.intro a:hover {
  text-decoration: underline;
}

.intro .col1,
.intro .col3 {
  margin: 30px 0;
}

.intro .col3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  max-width: 860px;
  margin: 30px auto;
}

.intro .col1 {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafd;
  margin: 30px;
  border-radius: 4px;
}

.intro .avatar img,
.intro .icon {
  display: block;
  margin: 0 auto 10px;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
}

.intro .icon {
  background: #fafafd;
  font-size: 36px;
  line-height: 100px;
  color: initial;
}

.intro .col1 .icon {
  margin: 0; 
}

.legacy-archives-notice {
  max-width: 1000px;
  margin: 16px auto;
  padding: 18px 22px;
  font-size: 15px;
  border: 1px solid #bbc;
  border-radius: 4px;
}

.legacy-archives-notice summary {
  cursor: pointer;
  outline: 0;
}

.legacy-archives-notice a {
  color: var(--blue);
  cursor: pointer;
}

.legacy-archives-notice a:hover {
  text-decoration: underline;
}

.legacy-archives-notice .archives {
  margin-top: 10px;
}

.legacy-archives-notice .archive {
  display: flex;
  align-items: center;
  padding: 5px 0;
  border-top: 1px solid #ccd;
}

.legacy-archives-notice .archive:hover {
  background: #fafafd;
}

.legacy-archives-notice .archive a {
  margin-right: auto;
}

`
export default cssStr