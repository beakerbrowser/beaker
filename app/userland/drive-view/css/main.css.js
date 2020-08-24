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
  position: sticky;
  top: 20px;
}

.header {
  margin: 20px 0px 10px;
}

.header button {
  position: absolute;
  font-size: 12px;
  top: 18px;
  left: 72px;
  box-shadow: none;
  border-radius: 16px;
  border: 1px solid #4472f3;
  color: #3867ef;
}

.header .thumb {
  padding-bottom: 8px;
}

.header img {
  object-fit: cover;
  border-radius: 50%;
  height: 60px;
  width: 60px;
}

.header .info {
}

.header .title {
  font-family: arial;
  font-size: 21px;
  font-weight: bold;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

.nav .nav-item {
  display: block;
  padding: 6px 0;
  color: var(--text-color--default);
  font-size: 13px;
}

.nav .fa-fw {
  position: relative;
  top: -1px;
  font-size: 11px;
  margin-right: 4px;
  color: var(--text-color--light);
}

.nav .nav-item.current,
.nav .nav-item:hover {
  text-decoration: none;
}

.nav .nav-item.current {
  font-weight: 500;
}

beaker-record-thread {
  margin: 20px 0;
}

@media(max-width: 980px) {
  :host {
    display: block;
  }

  .content {
    max-width: 800px;
    margin: 130px auto 0;
  }

  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    width: 100%;
    height: 112px;
    z-index: 20;
    background: var(--bg-color--default);
    border-bottom: 1px solid var(--border-color--light);
  }

  .sidebar-inner {
    position: relative;
    top: 0;
    display: block;
    max-width: 800px;
    margin: 0 auto;
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
    width: 60px;
    height: 60px;
  }

  .header button {
    top: 10px;
    left: unset;
    right: 10px;
  }

  .header .info {
    padding: 8px;
  }

  .nav {
    display: flex;
  }
  
  .nav .nav-item {
    border-bottom: 2px solid transparent;
    margin-right: 5px;
    padding: 6px;
  }
  
  .nav .nav-item.current {
    border-bottom: 2px solid var(--border-color--nav-highlight);
  }
}
`
export default cssStr