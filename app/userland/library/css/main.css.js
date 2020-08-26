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
  grid-template-columns: 190px 1fr auto;
  padding: 10px;
  position: sticky;
  top: 0;
  z-index: 1;
  border-bottom: 1px solid var(--border-color--light);
}

header .brand {
  display: flex;
  align-items: center;
  font-size: 18px;
  line-height: 35px;
  padding-left: 7px;
  color: var(--text-color--lightish);
}

header .brand img {
  margin-right: 2px;
  width: 18px;
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
  padding: 4px 4px 4px 12px;
}

.layout {
  display: grid;
  grid-template-columns: 200px 1fr;
}

nav .page-nav a {
  display: block;
  padding: 10px 20px;
  color: var(--text-color--lightish);
  margin: 10px;
  border-radius: 26px;
  font-weight: 400;
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
drives-view,
history-view {
  padding-bottom: 100px;
}

@media (max-width: 960px) {
  header {
    grid-template-columns: 120px 1fr auto;
    padding: 5px;
  }

  header .brand {
    font-size: 16px;
    line-height: 35px;
    padding-left: 7px;
    color: var(--text-color--lightish);
  }

  header .brand .fas {
    margin-right: 2px;
    font-size: 15px;
    color: #2196F3;
  }
  .layout {
    display: block;
  }
  .page-nav {
    display: flex;
    border-bottom: 1px solid var(--border-color--light);
  }
  nav .page-nav a {
    margin: 0;
    border-radius: 0;
    padding: 8px 14px;
  }
  nav .page-nav a.current {
    font-weight: 500;
  }
  nav .page-nav a .fa-fw {
    margin-right: 0;
  }
}

@media (max-width: 660px) {
  nav .page-nav a .label {
    display: none;
  }
}
`
export default cssStr