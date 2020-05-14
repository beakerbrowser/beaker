import {css} from '../../vendor/lit-element/lit-element.js'

const cssStr = css`
.message {
  display: flex;
  padding: 16px;
}

.message.error {
  border: 1px solid #de1c1c;
  border-radius: 4px;
  background: #ffafaf;
  color: #920101;
}

.message .icon {
  margin-right: 16px;
  font-size: 21px;
}

.message .title {
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 10px;
}
`
export default cssStr
