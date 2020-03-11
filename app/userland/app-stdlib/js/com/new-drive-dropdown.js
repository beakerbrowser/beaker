import { html } from '../../vendor/lit-element/lit-element.js'
import { HELP } from '../const.js'
import * as contextMenu from './context-menu.js'
import * as toast from './toast.js'

export async function create ({x, y}) {
  return contextMenu.create({
    x,
    y,
    render: () => {
      return html`
        <link rel="stylesheet" href="beaker://assets/font-awesome.css">
        <style>
          .dropdown-items {
            padding: 6px 0 4px;
            overflow: visible !important;
            box-shadow: rgba(0, 0, 0, 0.1) 0px 2px 15px !important;
            border-color: #bbc;
          }
          .dropdown-item {
            position: relative;
            padding-top: 14px !important;
            padding-bottom: 10px !important;
          }
          .dropdown-item .hover-help {
            display: none;
            position: absolute;
            top: 0;
            right: calc(100% + 10px);
            background: #fff;
            color: #556;
            padding: 16px;
            border: 1px solid #bbc;
            border-radius: 8px;
            box-shadow: 0 2px 15px rgba(0, 0, 0, 0.1);
            width: 280px;
            white-space: normal;
            line-height: 1.3;
            letter-spacing: 0.25px;
          }
          .dropdown-item .hover-help .fa-info {
            margin-right: 14px;
            margin-top: 4px;
            color: #889;
          }
          .dropdown-item .hover-help p {
            margin: 0;
          }
          .dropdown-item:hover .hover-help {
            display: flex;
          }
          .fa-fw {
            margin-left: 2px !important;
            margin-right: 10px !important;
          }
          .description {
            margin-left: 35px !important;
          }
        </style>
        <div class="dropdown-items roomy no-border">
          <div class="dropdown-item" @click=${() => onCreateDrive('website')}>
            <div class="label">
              <i class="fas fa-fw fa-desktop"></i>
              Website
            </div>
            <div class="hover-help">
              <span class="fas fa-info"></span> ${HELP.websites()}
            </div>
          </div>
          <div class="dropdown-item" @click=${() => onCreateDrive()}>
            <div class="label">
              <i class="far fa-fw fa-hdd"></i>
              Files drive
            </div>
            <div class="hover-help">
              <span class="fas fa-info"></span> ${HELP.files()}
            </div>
          </div>
          <div class="dropdown-item" @click=${() => onCreateDrive('group')}>
            <div class="label">
              <i class="fas fa-fw fa-users"></i>
              User Group
            </div>
            <div class="hover-help">
              <span class="fas fa-info"></span> ${HELP.groups()}
            </div>
          </div>
          <div class="dropdown-item" @click=${() => onCreateDrive('module')}>
            <div class="label">
              <i class="fas fa-fw fa-cube"></i>
              Module
            </div>
            <div class="hover-help">
              <span class="fas fa-info"></span> ${HELP.modules()}
            </div>
          </div>
          <hr>
          <div class="dropdown-item" @click=${onCreateDriveFromFolder}>
            <div class="label">
              <i class="far fa-fw fa-folder"></i>
              From folder
            </div>
            <div class="hover-help">
            <span class="fas fa-info"></span> <p>Create a hyperdrive by importing from a folder on your computer.</p>
            </div>
          </div>
        </div>
      `
    }
  })
}

async function onCreateDrive (type) {
  contextMenu.destroy()
  var drive = await beaker.hyperdrive.createDrive({type})
  window.location = drive.url
}

async function onCreateDriveFromFolder () {
  contextMenu.destroy()
  var folder = await beaker.browser.showOpenDialog({
    title: 'Select folder',
    buttonLabel: 'Use folder',
    properties: ['openDirectory']
  })
  if (!folder || !folder.length) return

  var drive = await beaker.hyperdrive.createDrive({
    title: folder[0].split('/').pop(),
    prompt: false
  })
  toast.create('Importing...')
  await beaker.hyperdrive.importFromFilesystem({src: folder[0], dst: drive.url})
  window.location = drive.url
}