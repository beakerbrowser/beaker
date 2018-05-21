import {ExampleModal} from './example'
import {CreateArchiveModal} from './create-archive'
import {SelectArchiveModal} from './select-archive'

// must include modals here for them to be callable from the background-process
export default {
  example: ExampleModal,
  'create-archive': CreateArchiveModal,
  'select-archive': SelectArchiveModal
}