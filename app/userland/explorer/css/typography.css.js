import {css} from '../vendor/lit-element/lit-element.js'

const cssStr = css`
body {
  --system-font: -apple-system, BlinkMacSystemFont, system-ui, "Segoe UI", Ubuntu, Cantarell, "Oxygen Sans", "Helvetica Neue", sans-serif;
  --code-font: Consolas, 'Lucida Console', Monaco, monospace;
}

body {
  font-family: var(--system-font);
}

code {
  font-family: var(--code-font);
  font-style: normal;
}

`
export default cssStr
