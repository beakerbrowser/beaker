import {css} from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import colorsCSS from '../../../app-stdlib/css/colors.css.js'

const cssStr = css`
${colorsCSS}

:host {
  display: block;
  padding: 0 12px;
}

.heading {
  margin: 4px 0;
  color: var(--color-text);
}

a {
  display: inline-block;
  cursor: pointer;
  color: var(--color-text--muted);
  padding: 4px 16px;
}

a:hover {
  text-decoration: underline;
}

a.current {
  color: var(--blue);
}
`
export default cssStr