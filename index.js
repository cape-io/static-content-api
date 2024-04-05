import _ from 'lodash/fp.js'
import { isFalse, mapP, neq } from 'understory'
import {
  addField, copy, propDo, setField, setFieldWith,
} from 'prairie'
import { promises as fsxtr } from 'fs-extender'
import { createCompoundSchema } from 'genson-js'

import { saveData } from './lib/utils.js'
import { addPathInfo, addPathProps } from './lib/path.js'
import { addContent } from './lib/content.js'

const getFileSlugDefault = ({ base, ext }) => _.flow(_.replace(ext, ''), _.kebabCase)(base)

function filterDirs(ignoreDirs) {
  if (!_.isArray(ignoreDirs)) return _.stubTrue
  return (dir) => !ignoreDirs.includes(dir)
}

const fixFileInfo = ({ getFileSlug, parentDir }) => _.flow(
  setFieldWith('isDirectory', 'stats', (x) => x.isDirectory()),
  copy('path', 'sourcePath'),
  _.update('path', _.replace(parentDir, '')),
  ({ stats, ...rest }) => ({ ...rest, ..._.pick(['blocks', 'mtime', 'ctime', 'size'], stats) }),
  addPathInfo,
  setField('fileSlug', getFileSlug || getFileSlugDefault),
  _.set('parentDir', parentDir),
)
const isNotDotFile = (path) => path && !path.startsWith('/.')
const fixFileInfos = (opts) => _.flow(
  _.map(fixFileInfo(opts)),
  _.filter(_.overEvery([
    propDo('path', isNotDotFile),
    propDo('blocks', neq(0)),
    propDo('isDirectory', isFalse),
    opts.requireDir ? propDo('dir', neq('')) : _.stubTrue,
    propDo('pathParts[0]', filterDirs(opts.ignoreDirs)),
  ])),
)

function saveCollection(save) {
  return ([collectionId, items]) => Promise.all([
    save(collectionId, items),
    save(`${collectionId}.schema`, createCompoundSchema(items)),
  ])
}

function saveOutput(opts) {
  const { groupBy, keyIndex, outputFilename } = opts
  const save = saveData(opts)
  return (data) => {
    const collectionIndex = _.groupBy(groupBy, data)
    const collections = _.toPairs(collectionIndex)
    return Promise.all([
      save(outputFilename, keyIndex ? collectionIndex : data),
      ...collections.map(saveCollection(save)),
    ])
  }
}

export const getOpts = _.flow(
  _.defaults({
    customSortVals: {
      id: '!',
      info: 'zz',
    },
    finalProcessing: _.identity,
    // fieldSorter: () => {},
    jsonArgs: {
      // spaces: 2,
    },
    // fields: [
    // 'base', 'blocks', 'ctime', 'dir', 'ext', 'mtime',
    // 'fileSlug', 'language', 'name', 'pathParts',
    // 'parentDir', 'path', 'size', 'sourcePath' ],
    inputHumps: true,
    // ignoreDirs: ['foo', 'ignore', 'config'],
    keyIndex: true, // Output an array or an object keyed by collection.
    // groupBy: 'collection',
    mergePathProps: true, // Extracted file path props in root. Otherwise within `info.pathProps`.
    mergeInfo: false,
    outputDir: 'public',
    outputFilename: 'index',
    parentDir: 'content', // Where to find the collections of content.
    pathProps: ['collection'],
    requireDir: false, // Do not process files in the root, without being in a collection.
  }),
  addField('groupBy', _.get('pathProps[0]')),
)
// const logOut = (x) => console.log(x) || x
export function processContentWithOpts(opts = {}) {
  const { finalProcessing, parentDir, pathProps } = opts
  return fsxtr.list(parentDir)
    .then(fixFileInfos(opts))
    // .then((x) => console.log(x) || x)
    .then(mapP(_.flow(
      addPathProps(pathProps),
      addContent(opts),
      // logOut,
    )))
    .then(finalProcessing)
    .then(saveOutput(opts))
    .then(() => console.log('BUILD DATA: DONE'))
}

export const processContent = _.flow(getOpts, processContentWithOpts)
export default processContent
