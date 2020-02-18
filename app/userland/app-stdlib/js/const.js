import { html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'

export const HELP = {
  files: () => html`<p>Files drives are hyperdrive sites containing files. They're like .zip archives that live on the network.</p>`,
  websites: () => html`<p>Websites are hyperdrive sites that contain web pages and applications.</p>`,
  groups: () => html`<p>User Groups are hyperdrive sites with members who can share content together.</p>`,
  modules: () => html`<p>Modules are drives that contain code. They can be imported by other drives to provide reusable components.</p>`,
  frontends: () => html`<p>Frontends are swappable user-interfaces for drives.</p>`
}