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

.brand {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--bg-color--default);
  padding: 5px 0;
}

.brand h1 {
  margin: 0;
}

.brand .fa-arrow-up {
  position: relative;
  top: -8px;
  font-size: 18px;
  margin-right: 2px;
}

.search-ctrl {
  display: flex;
  position: relative;
  height: 32px;
  margin: 0 0 15px;
  z-index: 5;
}

.search-ctrl .fa-search,
.search-ctrl .spinner {
  position: absolute;
  z-index: 2;
  font-size: 13px;
  top: 10px;
  left: 14px;
  color: #99a;
}

.search-ctrl .spinner {
  top: 9px;
}

.search-ctrl input {
  position: relative;
  top: -1px;
  background: var(--bg-color--semi-light);
  color: inherit;
  box-sizing: border-box;
  height: 34px;
  flex: 1;
  font-size: 12px;
  letter-spacing: 0.5px;
  font-weight: 500;
  padding: 0 0 0 36px;
  border: 0 solid var(--border-color--default);
  border-radius: 24px;
}

.search-ctrl input:focus {
  background: var(--bg-color--default);
  border-color: var(--border-color--focused);
  box-shadow: 0 0 2px #7599ff77;
}

.search-ctrl .clear-search {
  position: absolute;
  left: 10px;
  top: 6px;
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

main {
}

.twocol {
  margin: 10px 20px 20px;
  display: grid;
  grid-template-columns: minmax(0, 3fr) 1fr;
  gap: 30px;
}

.twocol .sticky {
  position: sticky;
  top: 10px;
}

.twocol .sidebar > div {
  padding-top: 4px;
}

.twocol .sidebar h3 {
  box-sizing: border-box;
  letter-spacing: 1px;
  margin: 3px 0;
  font-weight: bold;
  text-transform: uppercase;
  font-size: 11px;
  color: var(--text-color--pretty-light);
}

.twocol .sidebar section {
  margin-bottom: 20px;
}

.twocol .sidebar .create button {
  text-align: left;
  padding: 10px 14px;
  font-size: 14px;
}

h3.feed-heading {
  margin: 0;
  position: sticky;
  top: 0;
  z-index: 1;
  background: #fff;
  padding: 10px 0;
  margin: 0 0 10px;
  border-bottom: 1px solid var(--border-color--light);
}

@media (max-width: 900px) {
  .twocol {
    display: block;
  }
  .two .sidebar section {
    margin-bottom: 0;
  }
  .two > :last-child {
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
  margin: 0 0 10px;
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
  margin: 10px auto;
  max-width: 840px;
}

.intro .explainer {
  background: var(--bg-color--light);
  padding: 10px;
  font-size: 18px;
  text-align: center;
}

.intro h4 {
  font-size: 21px;
  margin: 22px 0 10px;
}

.intro section p {
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