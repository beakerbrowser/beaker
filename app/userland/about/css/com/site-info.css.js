import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import buttons2CSS from 'beaker://app-stdlib/css/buttons2.css.js'
import tooltipCSS from 'beaker://app-stdlib/css/tooltip.css.js'

const cssStr = css`
${buttons2CSS}
${tooltipCSS}

a {
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

.info {
  padding: 6px 10px;
}

.full {
  display: grid;
  grid-template-columns: 80px 1fr auto;
  padding: 10px 12px;
}

.full .thumb {
  display: block;
  width: 80px;
  height: 80px;
  border-radius: 4px;
  object-fit: cover;
}

.full .info {
  padding: 0 12px 0;
}

.full .title {
  font-family: arial;
  font-size: 32px;
  font-weight: bold;
  line-height: 1;
  margin: 0 0 4px;
}

.full .title a {
  color: inherit;
}

.full .description {
  margin: 0 0 6px;
}

.full .known-subscribers a {
  color: var(--text-color--light);
}

.full .known-subscribers strong {
  color: var(--text-color--default);
}

.full .ctrls {
}

.full .ctrls button {
  display: block;
  width: 100%;
  font-size: 14px;
  border-radius: 4px;
  border: 1px solid var(--text-color--markdown-link);
  color: var(--text-color--markdown-link);
  padding: 5px 15px;
}

.my-site {
  font-size: 12px;
  color: var(--text-color--light);
  font-weight: 500;
  line-height: 20px;
}
`
export default cssStr