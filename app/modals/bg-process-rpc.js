import * as rpc from 'pauls-electron-rpc'
import browserManifest from '@beaker/core/web-apis/manifests/internal/browser'
import usersManifest from '@beaker/core/web-apis/manifests/internal/users'
import archivesManifest from '@beaker/core/web-apis/manifests/internal/archives'
import datArchiveManifest from '@beaker/core/web-apis/manifests/external/dat-archive'
import libraryManifest from '@beaker/core/web-apis/manifests/external/unwalled-garden-library'
import profilesManifest from '@beaker/core/web-apis/manifests/external/unwalled-garden-profiles'
import modalsManifest from '../background-process/rpc-manifests/modals'

export const beakerBrowser = rpc.importAPI('beaker-browser', browserManifest)
export const users = rpc.importAPI('users', usersManifest)
export const archives = rpc.importAPI('archives', archivesManifest)
export const datArchive = rpc.importAPI('dat-archive', datArchiveManifest)
export const library = rpc.importAPI('unwalled-garden-library', libraryManifest)
export const profiles = rpc.importAPI('unwalled-garden-profiles', profilesManifest)
export const modals = rpc.importAPI('background-process-modals', modalsManifest)