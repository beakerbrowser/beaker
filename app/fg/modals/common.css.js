import {css} from '../vendor/lit-element/lit-element'

export default css`
.wrapper {
  padding: 10px 20px;
  user-select: none;
}

h1.title {
  font-size: 16px;
  border-bottom: 1px solid #eee;
  font-weight: 500;
}

.help-text {
  color: #707070;
  color: rgba(0, 0, 0, 0.6);
  font-style: italic;
}

.footnote {
  position: fixed;
  bottom: 50px;
  width: 90%;
}

form {
  padding-top: 10px;
}

form textarea,
form input,
form .input,
form details {
  display: block;
  width: 100%;
  margin: 5px 0 15px 0;
}

form textarea {
  resize: none;
  padding: 7px;
  height: 55px;
}

details input,
details textarea,
details .input {
  margin-bottom: 0;
}

details summary {
  outline: 0;
}

.form-actions {
  text-align: right;
}
`