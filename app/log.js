import env from './env'

export default function log (...args) {
  if (env.name !== 'production') {
    console.log.apply(console, args)
  }
}