import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import commonCSS from 'beaker://app-stdlib/css/common.css.js'
import buttonsCSS from 'beaker://app-stdlib/css/buttons2.css.js'
import tooltipCSS from 'beaker://app-stdlib/css/tooltip.css.js'
import spinnerCSS from 'beaker://app-stdlib/css/com/spinner.css.js'

const cssStr = css`
${commonCSS}
${buttonsCSS}
${tooltipCSS}
${spinnerCSS}

:host {
  display: block;
}

.hidden {
  display: none !important;
}

#topleft {
  position: absolute;
  top: 60px;
  left: calc(50vw - 685px);
  z-index: 11;
  display: flex;
  align-items: center;
}

#topleft a {
  font-size: 14px;
  color: var(--text-color--default);
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

.release-notice {
  position: relative;
  width: 100%;
  max-width: 1000px;
  margin: 0 auto 60px;
  padding: 12px 18px;
  border: 1px solid var(--border-color--default);
  font-size: 14px;
  letter-spacing: 0.5px;
  border-radius: 4px;
}

.release-notice .view-release-notes:hover {
  text-decoration: underline;
}

.release-notice .fa-rocket {
  margin-right: 5px;
}

.release-notice .close {
  color: var(--text-color--very-light);
  float: right;
}

.search-ctrl {
  position: relative;
  height: 34px;
  margin: 16px auto;
  max-width: 1000px;
  z-index: 5;
}

.search-ctrl .fa-search,
.search-ctrl .spinner {
  position: absolute;
  z-index: 2;
  font-size: 13px;
  top: 11px;
  left: 14px;
  color: #99a;
}

.search-ctrl .spinner {
  top: 10px;
}

.search-ctrl input {
  position: relative;
  top: -1px;
  background: var(--bg-color--default);
  color: inherit;
  box-sizing: border-box;
  height: 36px;
  width: 100%;
  font-size: 12px;
  letter-spacing: 0.5px;
  font-weight: 500;
  padding: 0 0 0 36px;
  border: 1px solid var(--border-color--default);
  border-radius: 24px;
}

.sources-ctrl {
  margin: 16px auto;
  max-width: 1000px;
}

.sources-ctrl label {
  display: inline-flex;
  align-items: center;
  font-weight: normal;
  font-size: 13px;
  margin-left: 14px;
}

.sources-ctrl input[type="radio"] {
  margin: 0 5px 0 0;
  background: var(--bg-color--default);
}

.pins {
  position: relative;
  display: grid;
  margin: 30px auto 0;
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

@media (prefers-color-scheme: dark) {
  .pins .add {
    color: #89899e;
  }
  
  .pins .add:hover {
    color: #aeaec1;
  }
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
  border: 1px solid var(--border-color--default);
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

main {
}

nav {
  position: fixed;
  z-index: 10;
  top: 58px;
  left: calc(50vw - 690px);
}

nav button {
  padding: 8px 14px;
}

nav a {
  display: block;
  font-weight: 400;
  letter-spacing: 0.5px;
  color: var(--text-color--light);
  cursor: pointer;
  font-size: 14px;
  padding: 6px 10px 6px;
  margin: 0 0 6px;
  border-radius: 24px;
}

nav a:hover,
nav a.active {
  background: var(--bg-color--nav--highlight);
  color: var(--text-color--nav--highlight);
}

nav a :-webkit-any(.fas, .far) {
  color: var(--text-color--light);
  margin-right: 5px;
}

nav hr {
  border: 0;
  border-top: 1px solid var(--border-color--very-light);
  margin: 15px 5px;
}

.views > * {
  display: block;
  height: calc(100vh - 100px);
  overflow: auto;
}

.recent-view h2 {
  display: flex;
  align-items: center;
  max-width: 1000px;
  height: 27px;
  margin: 0 auto 2px;
  font-weight: 500;
  color: var(--text-color--light);
  letter-spacing: 0.7px;
  font-size: 18px;
}

.recent-view h2 .create {
  margin-left: auto;
}

.recent-view h2 .create button {
  color: var(--blue);
  padding: 2px;
}

.recent-view h2 .create .fas {
  font-size: 10px;
  position: relative;
  top: -1px;
}

.recent-view .subview {
  margin-bottom: 20px;
  margin: 0 auto 20px;
  max-width: 1000px;
}

.intro {
  position: relative;
  max-width: 1000px;
  margin: 16px auto;
  text-align: center;
  border: 1px solid var(--border-color--default);
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
  background: var(--bg-color--light);
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
  background: var(--bg-color--light);
  font-size: 36px;
  line-height: 100px;
  color: inherit;
}

.intro .col1 .icon {
  margin: 0; 
}

.legacy-archives-notice {
  max-width: 1000px;
  margin: 16px auto;
  padding: 18px 22px;
  font-size: 15px;
  border: 1px solid var(--border-color--default);
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