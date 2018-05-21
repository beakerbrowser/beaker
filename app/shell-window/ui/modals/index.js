import {ExampleModal} from './example'
import {SelectArchiveModal} from './select-archive'

// must include modals here for them to be callable from the background-process
export default {
  example: ExampleModal,
  'select-archive': SelectArchiveModal
}