import { readFile } from 'fs/promises'
import _ from 'lodash/fp.js'
import fse from 'fs-extra'
import yaml from 'js-yaml'
// import yaml from 'yaml'
import sortKeys from 'sort-keys'
import humps from 'lodash-humps'
import { getOutPathWithExt } from './path.js'

export function loadYaml({ inputHumps }, filePath) {
  // const path = getPath(filePath, YAML_EXT)
  if (!fse.existsSync(filePath)) return Promise.resolve(null)
  return readFile(filePath, 'utf8')
    .then(yaml.load)
    .then(inputHumps ? humps : _.identity)
}

export function fieldSorter({ customSortVals }) {
  return (a, b) => {
    const aStr = customSortVals[a] || a
    const bStr = customSortVals[b] || b
    return aStr.localeCompare(bStr)
  }
}

export const saveData = _.curry((opts, filePath, data) => {
  const { jsonArgs } = opts
  const getPath = getOutPathWithExt(opts, 'json')
  if (!_.isPlainObject(data) && !_.isArray(data)) {
    console.error(data)
  }
  const compare = opts.fieldSorter || fieldSorter(opts)
  const dataSortedKeys = sortKeys(data, { compare, deep: true })

  return fse.outputJson(getPath(filePath), dataSortedKeys, jsonArgs)
    .then(() => dataSortedKeys)
})
