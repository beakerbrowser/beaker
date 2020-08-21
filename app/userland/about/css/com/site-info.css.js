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
  grid-template-columns: 70px 1fr auto;
  padding: 10px 12px;
}

.full .thumb {
  display: block;
  width: 70px;
  height: 70px;
  border-radius: 50%;
  object-fit: cover;
}

.full .info {
  padding: 6px 12px 0;
}

.full .title {
  font-family: arial;
  font-size: 18px;
  font-weight: bold;
  line-height: 1;
  margin: 0 0 6px;
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
  border-radius: 16px;
  padding: 7px 15px 6px;
  box-shadow: none;
}

.full .ctrls button.subscribe {
  border-color: #4472f3;
  color: #3867ef;
}

.full .ctrls button.subscribe .fa-fw {
  font-size: 12px;
}

.my-site {
  font-size: 12px;
  color: var(--text-color--light);
  font-weight: 500;
  line-height: 20px;
}
`
export default cssStr