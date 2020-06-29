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
  background: var(--bg-color--default);
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
  border-bottom: 1px solid var(--border-color--light);
}

header .brand {
  font-size: 18px;
  line-height: 35px;
  padding-left: 7px;
  color: var(--text-color--lightish);
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
  background: var(--bg-color--header-search);
  color: inherit;
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
  color: inherit;
}

header .new-btn {
  display: block;
  background: var(--bg-color--default);
  border: 1px solid var(--border-color--light);
  border-top: 1px solid #2196F3;
  color: var(--text-color--light);
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  border-radius: 2px;
  height: 32px;
  line-height: 32px;
  margin: 0 10px;
  padding-left: 4px;
  cursor: pointer;
}

header .new-btn .fa-fw {
  font-size: 12px;
}

header .new-btn.pressed,
header .new-btn:hover {
  background: var(--bg-color--new-btn--highlight);
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
  color: var(--text-color--lightish);
  margin: 10px;
  border-radius: 26px;
  font-weight: 500;
  letter-spacing: 0.5px;
}

nav .page-nav a:hover {
  background: var(--bg-color--light);
  cursor: pointer;
  text-decoration: none;
}

nav .page-nav a.current {
  background: var(--bg-color--nav--highlight);
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

address-book-view,
bookmarks-view,
downloads-view,
drives-view {
  padding-bottom: 100px;
}
`
export default cssStr