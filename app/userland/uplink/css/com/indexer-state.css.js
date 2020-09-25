import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import spinnerCSS from 'beaker://app-stdlib/css/com/spinner.css.js'

const cssStr = css`
${spinnerCSS}

:host {
  display: block;
}

div {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  background: var(--bg-color--light);
  padding: 4px 8px 4px 10px;
  border-radius: 16px;
  color: var(--text-color--light);
}

.spinner {
  width: 8px;
  height: 8px;
}

progress {
  width: 40px;
}

`
export default cssStr