import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import inputsCSS from 'beaker://app-stdlib/css/inputs.css.js'
import buttons2CSS from 'beaker://app-stdlib/css/buttons2.css.js'
import spinnerCSS from 'beaker://app-stdlib/css/com/spinner.css.js'

const cssStr = css`
${inputsCSS}
${buttons2CSS}
${spinnerCSS}

:host {
  display: block;
  max-width: 660px;
  margin: 10px;
}

a {
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

.annotation {
  border-top: 1px solid var(--border-color--light);
  padding: 16px 10px;
}

.annotation .header {
  display: flex;
  align-items: center;
}

.annotation .header a {
  color: var(--text-color--light);
}

.annotation .header .thumb img {
  display: block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 5px;
}

.annotation .header .date {
  margin-left: auto;
}

.annotation .content {
  padding: 0 20px;
}

.annotation .content > :first-child {
  margin-top: 10px;
}

.annotation .content > :last-child {
  margin-bottom: 10px;
}
`
export default cssStr