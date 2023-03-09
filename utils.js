import { readFile } from 'fs/promises'
import _ from 'lodash/fp.js'
import fse from 'fs-extra'
import yaml from 'js-yaml'
import sortKeys from 'sort-keys'
import humps from 'lodash-humps'

const withExt = (path, ext) => (!ext || _.endsWith(ext, path) ? path : `${path}.${ext}`)
export const getOutPath = ({ outputDir }) => (path, ext) => (path ? `${outputDir}/${withExt(path, ext)}` : outputDir)

export function getOutPathWithExt(opts, ext) {
  const getPathFunc = getOutPath(opts)
  return (path) => getPathFunc(path, ext)
}

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
