import {ExampleModal} from './example'
import {CreateArchiveModal} from './create-archive'
import {ForkArchiveModal} from './fork-archive'
import {SelectArchiveModal} from './select-archive'
import {PublishArchiveModal} from './publish-archive'
import {EditProfileModal} from './edit-profile'
import {TutorialModal} from './tutorial'
import {PromptModal} from './prompt'

// must include modals here for them to be callable from the background-process
export default {
  example: ExampleModal,
  'create-archive': CreateArchiveModal,
  'fork-archive': ForkArchiveModal,
  'select-archive': SelectArchiveModal,
  'publish-archive': PublishArchiveModal,
  'edit-profile': EditProfileModal,
  'tutorial': TutorialModal,
  'prompt': PromptModal
}