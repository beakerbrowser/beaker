import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import reactions from 'beaker://app-stdlib/css/com/reactions/reactions.css.js'

const cssStr = css`
${reactions}

:host {
  display: flex;
  align-items: center;
  color: gray;
  white-space: nowrap;
  padding: 5px 10px;
  font-size: 12px;
}

a {
  margin: 0 5px;
  color: inherit;
}

a:first-child {
  margin-left: 0;
}

beaker-reactions {
  display: flex;
  flex-wrap: wrap;
  margin-left: 8px;
}
`
export default cssStr