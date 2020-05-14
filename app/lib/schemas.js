import Ajv from 'ajv'
import { join as joinPath } from 'path'
import { readFileSync } from 'fs'

const ajv = (new Ajv())
var validators = {}

export function getValidator (name) {
  if (validators[name]) return validators[name]
  validators[name] = ajv.compile(JSON.parse(readFileSync(joinPath(__dirname, 'lib', 'schemas', name), 'utf8')))
  return validators[name]
}