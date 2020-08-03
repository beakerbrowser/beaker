import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import buttons2CSS from 'beaker://app-stdlib/css/buttons2.css.js'

const cssStr = css`
${buttons2CSS}

a {
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

.compact {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
}

.compact a {
  color: var(--text-color--lightish);
}

.info {
  padding: 6px 10px;
}

.compact h1 {
  font-weight: 500;
  font-size: 15px;
  margin: 0;
  line-height: 1;
}

.compact .known-followers {
  color: var(--text-color--pretty-light);
  font-size: 12px;
}

.compact .ctrls {
  padding-right: 10px;
}

.compact button {
  font-size: 11px;
}

.compact button .fa-fw {
  font-size: 9px;
}

.full {
  display: grid;
  grid-template-columns: 86px 1fr;
  border-bottom: 1px solid var(--border-color--default);
}

.full .thumb {
  display: block;
  width: 86px;
  height: 86px;
  object-fit: cover;
}

.full .info {
  padding: 8px 16px;
}

.full h1 {
  font-size: 21px;
  letter-spacing: 0.7px;
  margin: 0;
}

.full .description {
  color: var(--text-color--light);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.full .known-followers {
  color: var(--text-color--light);
}

.full .ctrls {
  padding-top: 4px;
}

.full button {
  font-size: 11px;
  padding: 3px 8px;
}

.full button .fa-fw {
  font-size: 9px;
}

.my-site {
  font-size: 12px;
  color: var(--text-color--light);
  font-weight: 500;
  line-height: 20px;
}
`
export default cssStr