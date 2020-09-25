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

input:focus {
  border-color: var(--border-color--focused);
  box-shadow: 0 0 2px #7599ff77;
}

#topleft {
  position: absolute;
  top: 60px;
  left: calc(50vw - 685px);
  z-index: 11;
  display: flex;
  align-items: center;
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

.no-feed-view {
  margin: 30vh 0px 0;
}

.release-notice {
  position: relative;
  width: 100%;
  padding: 12px 18px;
  font-size: 14px;
  letter-spacing: 0.5px;
  text-align: center;
  background: var(--bg-color--light);
  border-top: 1px solid var(--border-color--light);
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

header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  z-index: 100;
  background: var(--bg-color--default);
  padding: 0 10px 4px;
  box-sizing: content-box;
  border-bottom: 1px solid var(--border-color--light);
}

.search-ctrl {
  position: relative;
  height: 34px;
  margin: 7px 0 7px;
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
  background: var(--bg-color--default);
  color: inherit;
  box-sizing: border-box;
  height: 36px;
  width: 100%;
  max-width: 1000px;
  font-size: 12px;
  letter-spacing: 0.5px;
  font-weight: 500;
  padding: 0 0 0 36px;
  border: 1px solid var(--border-color--default);
  border-radius: 24px;
}

.search-ctrl input:focus {
  border-color: var(--border-color--focused);
  box-shadow: 0 0 2px #7599ff77;
}

.search-ctrl .clear-search {
  position: absolute;
  left: 10px;
  top: 7px;
  z-index: 2;
  display: flex;
  background: var(--bg-color--semi-light);
  width: 20px;
  height: 20px;
  border-radius: 50%;
  cursor: pointer;
}

.search-ctrl .clear-search span {
  margin: auto;
}

.search-ctrl.big {
  height: 42px;
  margin: 0 0 40px;
}

.search-ctrl.big input {
  height: 42px;
}

.search-ctrl.big input::placeholder {
  position: relative;
  top: 0.5px;
}

.search-ctrl.big .fa-search {
  top: 15px;
}

.search-ctrl.big .spinner {
  top: 14px;
}

.pins {
  position: relative;
  display: grid;
  margin: 30px auto 30px;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  grid-gap: 15px;
  width: 100%;
  max-width: 1000px;
  user-select: none;
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
  width: 100px;
  height: 70px;
  line-height: 70px;
  object-fit: cover;
  object-position: top center;
  border: 1px solid var(--border-color--default);
}

.pin:hover .thumb {
  border-color: #889;
}

.pin .details {
  padding: 10px 2px 10px;
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

.pin.add {
  font-size: 21px;
  color: rgba(0, 0, 150, 0.35);
  cursor: pointer;
}

.pin.add .thumb {
  background: var(--bg-color--semi-light);
  border: 0;
}

.pin.add:hover {
  color: rgba(0, 0, 150, 0.5);
}

@media (prefers-color-scheme: dark) {
  .pin.add {
    color: #89899e;
  }
  
  .pin.add:hover {
    color: #aeaec1;
  }
}

.views > * {
  display: block;
  padding: 0 10px;
  height: calc(100vh - 50px);
  overflow: auto;
}

.onecol {
  margin: 20vh auto 0;
  max-width: 1000px;
}

.onecol beaker-record-feed {
  max-width: 800px;
  margin: 0 auto;
}

.twocol {
  margin: 90px 20px 0;
  display: grid;
  grid-template-columns: minmax(0, 2fr) 1fr;
  gap: 30px;
}

.twocol .sidebar {
  padding: 20px 0;
}

h3.feed-heading {
  margin: 0;
  background: #fff;
  padding: 10px 0;
  margin: 0 0 10px;
  border-bottom: 1px solid var(--border-color--light);
}

@media (max-width: 1000px) {
  .onecol {
    padding: 0 20px;
  }
}

@media (max-width: 900px) {
  .twocol {
    display: block;
  }
  .twocol > :last-child {
    display: none;
  }
  beaker-sites-list {
    margin-top: 20px;
  }
}

.sidebar .quick-links h3 {
  margin-bottom: 5px;
}

.quick-links a {
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  letter-spacing: 0.5px;
  padding: 4px 0;
  color: var(--text-color--default);
}

.quick-links a:hover {
  text-decoration: underline;
}

.quick-links a img {
  display: block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 8px;
}

.quick-links a :-webkit-any(.far, .fas) {
  width: 16px;
  margin-right: 8px;
  color: var(--text-color--light);
}

.quick-links a img.favicon {
  border-radius: 0;
}

.suggested-sites .site {
  margin: 10px 0;
  padding: 10px;
  border-radius: 4px;
  background: var(--bg-color--secondary);
}

.suggested-sites .site .title a {
  color: var(--text-color--link);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.5px;
}

.suggested-sites .site .subscribers {
  margin-bottom: 2px;
}

.suggested-sites .site .subscribers a {
  color: var(--text-color--pretty-light);
}

.suggested-sites .site button {
  font-size: 11px;
  letter-spacing: 0.5px;
}

.alternatives {
  color: var(--text-color--pretty-light);
  margin: 0 0 20px;
}

.alternatives .search-engine {
  display: inline-block;
  margin: 0 3px;
  position: relative;
  top: 5px;
}

.alternatives .search-engine:first-of-type {
  margin-left: 4px;
}

.alternatives .search-engine:hover {
  text-decoration: none;
}

.alternatives .search-engine img {
  display: inline-block;
  width: 18px;
  height: 18px;
  object-fit: cover;
  image-rendering: -webkit-optimize-contrast;
}

beaker-record-feed,
beaker-sites-list {
  margin-bottom: 10px;
}

.intro {
  margin-bottom: 10px;
}

.intro h4 {
  font-size: 21px;
  margin: 22px 0 10px;
}

.intro p {
  font-size: 15px;
}

.intro a {
  color: var(--text-color--link);
  cursor: pointer;
}

.intro a:hover {
  text-decoration: underline;
}

.intro button {
  font-size: 15px;
}

.intro section {
  display: flex;
  align-items: flex-start;
  margin: 0;
  padding: 0 0 5px;
  border: 1px solid var(--border-color--default);
  border-bottom-width: 0;
}

.intro section:last-child {
  border-bottom-width: 1px;
}

.intro .icon {
  font-size: 32px;
  width: 80px;
  height: 70px;
  text-align: center;
  line-height: 70px;
  color: inherit;
}

.intro .icon .fa-user-plus {
  font-size: 31px;
}

.intro .suggested-sites {
  display: grid;
  grid-template-columns: repeat(3, 220px);
  grid-template-rows: auto auto;
  align-items: baseline;
  gap: 10px;
  margin: 30px 2px 30px;
}

.intro .suggested-sites .site {
  margin: 0px;
  padding: 16px;
  background: var(--bg-color--default);
  border-radius: 4px;
  border: 1px solid var(--border-color--light);
}

.intro .suggested-sites .site .title a {
  font-size: 16px;
}

.intro .suggested-sites .site .description {
  margin: 4px 0 10px;
}

.intro .suggested-sites .site button {
  display: block;
  width: 100%;
  text-align: center;
  font-size: 13px;
}

.intro .suggested-sites .site .subscribers {
  text-align: center;
  margin-top: 5px;
  padding: 4px 0;
  border-radius: 4px;
  background: var(--bg-color--light);
  color: var(--text-color--light);
}

.intro .btn-group {
  white-space: nowrap;
  margin: 10px -12px;
}

.intro .btn-group button {
  font-size: 15px;
}

.legacy-archives {
  font-size: 14px;
}

.legacy-archives a {
  color: var(--text-color--link);
  cursor: pointer;
}

.legacy-archives .archives {
  margin-top: 10px;
}

.legacy-archives .archive {
  padding: 10px;
  margin-bottom: 4px;
  border-radius: 4px;
  background: var(--bg-color--light);
}

.legacy-archives .archive:hover {
  background: #fafafd;
}

.legacy-archives .archive a {
  display: block;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.5px;
  margin-bottom: 5px;
}

.content-nav {
  display: flex;
  padding: 0 10px;
}

.content-nav > a {
  display: block;
  position: relative;
  cursor: pointer;
  padding: 6px 0;
  margin-right: 15px;
  color: var(--text-color--default);
  font-size: 11px;
  font-weight: 400;
  letter-spacing: 0.7px;
  line-height: 17px;
}

.content-nav .content-nav-item .fa-fw {
  display: inline-block;
  font-size: 10px;
  margin-right: 4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  line-height: 19px;
  color: var(--text-color--default);
  background: var(--bg-color--semi-light);
}

.content-nav .content-nav-item.current,
.content-nav .content-nav-item:hover {
  text-decoration: none;
}

.content-nav .content-nav-item.current {
  font-weight: 500;
  color: var(--text-color--markdown-link);
}

.content-nav .content-nav-item.current .fa-fw {
  color: #fff;
  background: var(--text-color--markdown-link);
}

.content-nav .sep {
  width: 1px;
  height: 10px;
  margin: 10px 15px 0 0;
  background: var(--border-color--light);
}

.empty {
  font-size: 16px;
  letter-spacing: 0.7px;
  color: var(--text-color--light);
  padding: 160px 0px 170px;
  background: var(--bg-color--light);
  text-align: center;
}

.empty :-webkit-any(.fas, .far) {
  font-size: 58px;
  color: var(--text-color--very-light);
  margin: 0 0 30px;
}

`
export default cssStr