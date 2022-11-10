import { BaseSlideView } from './base-slide-view.js'

customElements.define('license-view', class extends BaseSlideView {
  render () {
    return `
<style>
:host {
  opacity: 0;
  transition: opacity 1s;
  text-align: center;
}
:host([fadein]) {
  opacity: 1;
}
:host([fadeout]) {
  opacity: 0;
}
h1 {
  text-align: center;
  margin: 15px 0;
}
h1 strong {
  font-size: 32px;
}
.license {
  -webkit-app-region: no-drag;
  max-height: calc(100vh - 150px);
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 10px;
  overflow-y: scroll;
  text-align: left;
  line-height: 1.4;
}
</style>
<h1><strong>License</strong></h1>
<div class="license">
  <p>Beaker is provided by Blue Link Labs, Inc.</p>
  <ul>
    <li>Beaker Browser is distributed under the MIT license.</li>
    <li>You are personally responsible for the content you share.</li>
    <li>Your IP address is publicly available while using Beaker Browser.</li>
    <li>We collect anonymized usage statistics if you don't opt out.</li>
  </ul>
  <h2>MIT License</h2>
  <p>Copyright (c) 2018 Blue Link Labs</p>
  <p>Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:</p>
  
  <p>The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.</p>
  
  <p>THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.</p>
</div>
<a>Next</a>
    `
  }
})