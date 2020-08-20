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
  display: block;
  position: relative;
  background: var(--bg-color--light);
}

beaker-resource {
  display: block;
}

.subject {
  background: var(--bg-color--default);
  border: 1px solid var(--border-color--light);
  border-radius: 4px;
  padding: 0 10px;
  margin-bottom: 10px;
}

.subject beaker-resource[render-mode="link"] {
  margin: 10px 6px;
}

.subject .not-found {
  display: inline-block;
  margin: 10px 2px;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  color: var(--text-color--link);
}

.subject .not-found:hover {
  text-decoration: underline;
}

.comment-prompt {
  padding: 10px 14px;
  margin-bottom: 10px;
  border-radius: 4px;
  border: 1px solid var(--border-color--light);
  font-style: italic;
  background: var(--bg-color--default);
  color: var(--text-color--light);
}

.replies {
  margin: 0 0 0 15px;
  border-left: 1px solid var(--border-color--semi-light);
}

.replies beaker-resource {
  display: block;
}


`
export default cssStr