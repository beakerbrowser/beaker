import {css} from '../vendor/lit-element/lit-element.js'

const cssStr = css`
body {
  /* common simple colors */
  --red: rgb(255, 59, 48);
  --orange: rgb(255, 149, 0);
  --yellow: rgb(255, 204, 0);
  --lime: #E6EE9C;
  --green: rgb(51, 167, 71);
  --teal: rgb(90, 200, 250);
  --blue: #2864dc;
  --purple: rgb(88, 86, 214);
  --pink: rgb(255, 45, 85);

  /* common element colors */
  --color-text: #333;
  --color-text--muted: gray;
  --color-text--light: #aaa;
  --color-text--dark: #111;
  --color-link: #295fcb;
  --color-focus-box-shadow: rgba(41, 95, 203, 0.8);
  --border-color: #d4d7dc;
  --light-border-color: #e4e7ec;
}
`
export default cssStr
