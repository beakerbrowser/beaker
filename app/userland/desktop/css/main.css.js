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

@media (max-width: 1040px) {
  #topright {
    right: 15px;
    top: 62px;
  }
}

.release-notice {
  position: relative;
  width: 100%;
  max-width: 1000px;
  margin: 0 auto 10px;
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

header {
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 10px;
  box-sizing: content-box;
}

.search-ctrl {
  display: flex;
  position: relative;
  height: 34px;
  margin: 7px 0 8px;
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
  flex: 1;
  font-size: 12px;
  letter-spacing: 0.5px;
  font-weight: 500;
  padding: 0 0 0 36px;
  border: 1px solid var(--border-color--default);
  border-radius: 24px;

  /* to go flush against the search-mod-btn */
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  border-right-width: 0;
}

.search-ctrl input:focus {
  border-color: var(--border-color--focused);
  box-shadow: 0 0 2px #7599ff77;
}

.search-ctrl .clear-search {
  position: absolute;
  left: -26px;
  top: 7px;
  z-index: 1;
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

.search-ctrl .search-mod-btn {
  position: relative;
  top: -1px;
  background: var(--bg-color--default);
  color: inherit;
  box-sizing: border-box;
  height: 36px;
  font-size: 12px;
  letter-spacing: 0.5px;
  font-weight: 500;
  border: 1px solid var(--border-color--default);
  border-radius: 24px;
  line-height: 34px;
  padding: 0 12px 0 12px;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}

.search-ctrl .search-mod-btn:hover {
  background: var(--bg-color--light);
  cursor: pointer;
}

@media (max-width: 900px) {
  .search-ctrl .clear-search  {
    left: unset;
    right: 98px;
  }
}

.pins {
  position: relative;
  display: grid;
  margin: 30px auto 0;
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

main {
  border-top: 1px solid var(--border-color--light);
}

.views > * {
  display: block;
  padding: 0 10px;
  height: calc(100vh - 50px);
  overflow: auto;
}

.all-view h2 {
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 4px 4px;
  box-sizing: border-box;
  font-weight: 500;
  color: var(--text-color--light);
  letter-spacing: 0.7px;
  font-size: 15px;
  border-bottom: 1px solid var(--border-color--light);
}

.all-view h2 a:hover {
  cursor: pointer;
  text-decoration: underline;
}

.onecol {
  margin-top: 10px;
}

.threecol {
  margin: 10px auto 20px;
  max-width: 1040px;
  display: grid;
  grid-template-columns: 130px minmax(0, 1fr) 170px;
  gap: 30px;
}

.threecol .sticky {
  position: sticky;
  top: 10px;
}

.threecol .sidebar > div {
  padding-top: 10px;
}

.threecol .sidebar h3 {
  box-sizing: border-box;
  letter-spacing: 1px;
  margin: 3px 0;
  font-weight: bold;
  text-transform: uppercase;
  font-size: 11px;
  color: var(--text-color--pretty-light);
}

.threecol .sidebar section {
  margin-bottom: 20px;
}

@media (max-width: 900px) {
  .pins {
    display: none;
  }
  .threecol {
    display: block;
  }
  .threecol > :first-child {
    margin-bottom: 10px;
  }
  .threecol > :first-child :-webkit-any(h3, .quick-links) {
    display: none;
  }
  .threecol .sidebar section {
    margin-bottom: 0;
  }
  .threecol .content-nav {
    display: inline-flex;
  }
  .threecol .content-nav .content-nav-item {
    margin-right: 10px;
    padding: 2px 5px;
  }
  .threecol .content-nav .content-nav-item .label {
    display: none;
  }
  .threecol > :last-child {
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
  margin: 0 5px 20px;
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
}


beaker-sites-list {
  margin-bottom: 20px;
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

.content-nav .content-nav-item {
  display: block;
  position: relative;
  cursor: pointer;
  padding: 6px 0;
  color: var(--text-color--default);
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.7px;
}

.content-nav .fa-fw {
  display: inline-block;
  font-size: 11px;
  margin-right: 4px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  line-height: 23px;
  color: var(--text-color--default);
  background: var(--bg-color--semi-light);
}

.content-nav .count {
  position: absolute;
  top: 3px;
  left: 15px;
  z-index: 1;
  min-width: 13px;
  text-align: center;
  font-size: 8px;
  border-radius: 4px;
  padding: 1px 2px;
  font-variant: tabular-nums;
  letter-spacing: 0;
  background: var(--text-color--markdown-link);
  border: 1px solid var(--bg-color--default);
  color: #fff;
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

.create-box {
  margin: 0 0 30px;
}

.create-box .btn-group {
  display: block;
  margin-top: 8px;
}

.create-box button {
  display: block;
  text-align: left;
  width: 100%;
  padding: 10px 16px;
  box-sizing: border-box;
  font-size: 13px;
  color: var(--text-color--default);
  border: 1px solid var(--border-color--light);
  border-bottom-width: 0;
}

.create-box .btn-group button:first-child {
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
}

.create-box .btn-group button:last-child {
  border-bottom-left-radius: 4px;
  border-bottom-right-radius: 4px;
  border-bottom-width: 1px;
}

.create-box button i {
  font-size: 13px;
  color: var(--text-color--light);
  margin-right: 5px;
}

@media (prefers-color-scheme: dark) {
  .create-box button {
    background: var(--bg-color--default);
  }
  .create-box button:hover {
    background: var(--bg-color--light);
  }
}

.empty {
  font-size: 16px;
  letter-spacing: 0.7px;
  color: var(--text-color--light);
  padding: 120px 0px 150px;
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