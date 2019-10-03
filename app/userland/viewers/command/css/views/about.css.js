import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'

const cssStr = css`

.command {
  display: flex;
  justify-content: space-between;
  padding: 10px;
  margin: 10px 0;
  border-radius: 4px;
  background: #f5f5fa;
}

.command small,
.command code {
  color: #668;
}

`
export default cssStr