import { webFrame } from 'electron'
import { setup as setupWebAPIs } from '../../bg/web-apis/fg.js'
import { setup as setupTutorial } from './tutorial'
import { setup as setupLocationbar } from './locationbar'
import { setup as setupPrompt } from './prompt'
import { setup as setupExecuteJavascript } from './execute-javascript'
import setupExitFullScreenHackfix from './exit-full-screen-hackfix'
import readableStreamAsyncIteratorPolyfill from './readable-stream-async-iterator-polyfill'
import windowOpenCloseHackfix from './window-open-close-hackfix'
import resizeHackfix from './resize-hackfix'
import createSpellChecker from '../../bg/web-apis/fg/spell-checker.js'
// import './read-page-metadata' DISABLED wasnt working effectively -prf

// webFrame.setSpellCheckProvider('en-US', createSpellChecker())

// HACKS
setupExitFullScreenHackfix()
readableStreamAsyncIteratorPolyfill()
windowOpenCloseHackfix()
resizeHackfix()

setupWebAPIs()
setupTutorial()
setupLocationbar()
setupPrompt()
setupExecuteJavascript()
