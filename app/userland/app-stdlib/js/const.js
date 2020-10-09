import { html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'

export const HELP = {
  files: () => html`<p>Files drives are shareable folders.</p>`,
  websites: () => html`<p>Websites contain web pages and applications.</p>`,
  groups: () => html`<p>User Groups host other users who can share content together.</p>`,
  modules: () => html`<p>Modules contain code. They can be imported by other drives to provide reusable components.</p>`,
  frontends: () => html`<p>Frontends are swappable user-interfaces for drives.</p>`
}