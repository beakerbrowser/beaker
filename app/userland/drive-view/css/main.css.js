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

.sidebar-inner {
}

.header {
  margin: 20px 0px 10px;
}

.header button {
  display: block;
  font-size: 14px;
  border-radius: 4px;
  border: 1px solid var(--text-color--markdown-link);
  color: var(--text-color--markdown-link);
}

.header .thumb {
  padding-bottom: 8px;
}

.header img {
  object-fit: cover;
  border-radius: 4px;
  height: 220px;
  width: 220px;
}

.header .sysicon {
  display: block;
  background: var(--bg-color--private-light);
  text-align: center;
  font-size: 66px;
  height: 180px;
  line-height: 170px;
  color: var(--text-color--private-default);
  border-radius: 4px;
}

.header .info {
  margin-bottom: 10px;
}

.header .title {
  font-family: arial;
  font-size: 32px;
  font-weight: bold;
  margin-bottom: 4px;
}

.header .title a {
  color: var(--text-color--default);
}

.header .description {
  margin-bottom: 4px;
  word-break: break-word;
}

.header .known-subscribers a {
  color: var(--text-color--light);
}

.header .known-subscribers a strong {
  color: var(--text-color--default);
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
    margin: 106px auto 0;
  }

  .content.full-nav {
    margin-top: 156px;
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

  .header {
    display: flex;
    margin: 0;
    border: 0;
  }

  .header .thumb {
    padding: 8px;
  }

  .header .thumb img {
    width: 80px;
    height: 80px;
  }
  
  .header .sysicon {
    font-size: 36px;
    height: 80px;
    width: 80px;
    line-height: 73px;
  }

  .header button {
    position: fixed;
    top: 10px;
    right: 10px;
    width: auto;
    padding: 5px 15px;
    padding-right: 20px; /* offsets the icon a little */
  }

  .header .info {
    padding: 8px;
    margin: 0;
  }

  .nav {
    position: relative;
    top: 0;
    display: flex;
    padding-left: 8px;
    padding-bottom: 11px;
  }
  
  .nav .nav-item {
    margin-right: 5px;
    padding: 0 6px;
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
}
`
export default cssStr