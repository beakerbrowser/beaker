import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import buttons2CSS from 'beaker://app-stdlib/css/buttons2.css.js'
import tooltipCSS from 'beaker://app-stdlib/css/tooltip.css.js'

const cssStr = css`
${buttons2CSS}
${tooltipCSS}

:host {
  display: block;
}

a {
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

.group {
  margin-bottom: 10px;
  overflow: hidden;
}

.group .group-title {
  background: var(--bg-color--light);
  font-size: 12px;
  font-weight: 500;
  padding: 4px 6px;
}

.group .group-content {
  padding: 6px 8px;
  border: 1px solid var(--border-color--light);
  border-radius: 4px;
}

.group .group-content + .group-content {
  margin-top: 2px;
}

.group .group-content .fa-small {
  font-size: 11px;
  position: relative;
  top: -1px;
}

.group .group-content small {
  color: var(--text-color--light);
}

.group .value {
  font-size: 14px;
}

.group .provenance {
  float: right;
  font-size: 12px;
  color: var(--text-color--very-light);
}

.site-info {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  border-bottom: 1px solid var(--border-color--light);
  background: var(--bg-color--light);
  padding: 5px 5px;
}

.site-info a {
  color: var(--text-color--default);
}

.site-info .fa-sitemap {
  font-size: 12px;
  margin-left: 2px;
}

.site-info .info {
  padding: 0 4px;
}

.site-info h1 {
  font-weight: 500;
  font-size: 13px;
  margin: 0;
  line-height: 1;
}

.site-info .ctrls {
}

.site-info button {
  font-size: 11px;
}

.site-info button .fa-fw {
  font-size: 9px;
}

.site-info .my-site {
  font-size: 12px;
  color: var(--text-color--light);
  font-weight: 500;
  line-height: 20px;
}

.site-info .my-site .fas {
  font-size: 10px;
}
`
export default cssStr