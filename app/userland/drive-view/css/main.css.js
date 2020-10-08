import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import buttons2CSS from 'beaker://app-stdlib/css/buttons2.css.js'
import tooltipCSS from 'beaker://app-stdlib/css/tooltip.css.js'
import spinnerCSS from 'beaker://app-stdlib/css/com/spinner.css.js'

const cssStr = css`
${buttons2CSS}
${tooltipCSS}
${spinnerCSS}

:host {
  --sans-serif: -apple-system, BlinkMacSystemFont, system-ui, "Segoe UI", Ubuntu, Cantarell, "Oxygen Sans", "Helvetica Neue", sans-serif;
  --monospace: Consolas, 'Lucida Console', Monaco, monospace;

  display: grid;
  max-width: 980px;
  grid-template-columns: 670px 220px;
  grid-gap: 30px;
  margin: 0 auto;
  padding: 0 30px;
  min-height: calc(100vh - 20px);
  font-family: var(--sans-serif);
}

a {
  text-decoration: none;
  color: #2864dc;
}

a:hover {
  text-decoration: underline;
}

.sidebar {
  margin: 20px 0px 10px;
}

.sidebar .thumb {
  padding-bottom: 8px;
}

.sidebar.no-thumb .thumb {
  display: none;
}

.sidebar img {
  object-fit: cover;
  border-radius: 4px;
  height: 220px;
  width: 220px;
}

.sidebar .sysicon {
  display: block;
  background: var(--bg-color--private-light);
  text-align: center;
  font-size: 66px;
  height: 180px;
  line-height: 170px;
  color: var(--text-color--private-default);
  border-radius: 4px;
}

.sidebar .title {
  font-family: arial;
  font-size: 22px;
  font-weight: bold;
  margin-bottom: 4px;
}

.sidebar .title a {
  color: var(--text-color--default);
}

.sidebar .description {
  margin-bottom: 8px;
  word-break: break-word;
}

.sidebar .known-subscribers {
  margin-bottom: 10px;
}

.sidebar .known-subscribers a {
  color: var(--text-color--light);
}

.sidebar .known-subscribers a strong {
  color: var(--text-color--default);
}

.sidebar .known-subscribers .subscribed-to-you {
  display: block;
  margin-bottom: 8px;
}

.sidebar .known-subscribers .subscribed-to-you span {
  display: inline-block;
  background: var(--bg-color--semi-light);
  color: var(--text-color--light);
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
}

.sidebar .btns {
  display: flex;
  margin-bottom: 10px;
}

.sidebar button {
  display: block;
  font-size: 14px;
  border-radius: 4px;
  border: 1px solid var(--text-color--markdown-link);
  color: var(--text-color--markdown-link);
  margin-right: 5px;
}

.nav {
  position: sticky;
  top: 20px;
}

.nav .nav-item {
  display: block;
  padding: 6px 0;
  color: var(--text-color--default);
  font-size: 14px;
  font-weight: 400;
  letter-spacing: 0.7px;
}

.nav .fa-fw {
  display: inline-block;
  font-size: 12px;
  margin-right: 4px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  line-height: 28px;
  color: var(--text-color--default);
  background: var(--bg-color--semi-light);
}

.nav .nav-item.current,
.nav .nav-item:hover {
  text-decoration: none;
}

.nav .nav-item.current {
  font-weight: 500;
  color: var(--text-color--markdown-link);
}

.nav .nav-item.current .fa-fw {
  color: #fff;
  background: var(--text-color--markdown-link);
}

:host(.private) .nav .nav-item.current {
  color: var(--text-color--private-link);
}

:host(.private) .nav .nav-item.current .fa-fw {
  background: var(--text-color--private-link);
}

.blocked {
  background: #ffcbcb;
  color: red;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 10px;
}

beaker-record-thread {
  margin: 20px 0 100px;
}

@media(min-width: 980px) {
  .nav .nav-item:before,
  .nav .nav-item:after {
    display: none !important;
  }
}

@media(max-width: 980px) {
  :host {
    display: block;
  }

  .content {
    max-width: 800px;
    margin: 100px auto 0;
  }

  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    width: 100%;
    z-index: 20;
    background: var(--bg-color--default);
    border-bottom: 1px solid var(--border-color--light);
  }

  .sidebar {
    margin: 0;
  }

  .sidebar-inner {
    display: grid;
    grid-template-columns: 70px 1fr;
    grid-template-rows: 30px 30px;
    margin: 8px 8px 5px;
  }

  .sidebar .thumb {
    grid-column-start: 1;
    grid-column-end: 2;
    grid-row-start: 1;
    grid-row-end: 4;
    padding: 0;
  }

  .sidebar .thumb img {
    width: 60px;
    height: 60px;
  }
  
  .sidebar .sysicon {
    font-size: 26px;
    height: 60px;
    width: 60px;
    line-height: 58px;
  }

  .sidebar .btns {
    position: fixed;
    top: 6px;
    right: 6px;
  }

  .sidebar .description {
    display: none;
  }

  .sidebar button {
    width: auto;
    padding: 5px 15px;
  }

  .sidebar .title {
    grid-column-start: 2;
    grid-column-end: 3;
    grid-row-start: 1;
    grid-row-end: 2;
  }

  .sidebar .description {
    grid-column-start: 2;
    grid-column-end: 3;
    grid-row-start: 2;
    grid-row-end: 3;
  }

  .sidebar .known-subscribers {
    position: fixed;
    right: 12px;
    top: 45px;
  }

  .sidebar .known-subscribers .subscribed-to-you {
    display: inline;
    margin: 0 4px 0 0;
  }

  .nav {
    display: flex;
    position: fixed;
    top: 38px;
    left: 80px;
  }
  
  .nav .nav-item {
    margin-right: 10px;
    padding: 0;
  }

  .nav .nav-item .fa-fw {
    font-size: 11px;
    width: 26px;
    height: 26px;
    line-height: 26px;
  }

  .nav .nav-item .label {
    display: none;
  }

  .sidebar.no-thumb .title {
    grid-column-start: 1;
  }

  .sidebar.no-thumb .nav {
    left: 10px;
  }
  
  .blocked {
    position: fixed;
    top: 5px;
    right: 190px;
    padding: 6px 10px;
  }
}
`
export default cssStr