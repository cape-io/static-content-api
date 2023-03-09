import _ from 'lodash/fp.js'
import { isFalse, neq } from 'understory'
import humps from 'lodash-humps'
import { addField, copy, mergeFieldsWith, propDo, setField, setFieldWith } from 'prairie'
import matter from 'gray-matter'
import { promises as fsxtr } from 'fs-extender'
import pathParse from 'path-parse'
import { saveData } from './utils.js'

function getFileInfo({ fields, mergePathProps }, info, language) {
  const infoKeep = fields ? _.pick(fields, info) : _.omit(['isDirectory', 'root'], info)
  infoKeep.language = language
  if (mergePathProps) delete infoKeep.pathProps
  return infoKeep
}
function getFileData({ mergePathProps }, info, data, content, excerpt) {
  const result = mergePathProps ? { ...humps(data), ...info.pathProps } : humps(data)
  if (content) {
    result.content = _.trim(content)
    result.excerpt = excerpt || null
  }
  // Create a default id field.
  if (!result.id) result.id = info.fileSlug
  return result
}
function addContent(opts) {
  const { mergeInfo, parentDir } = opts
  return (info) => {
    const { data, content, excerpt, language } = matter.read(`./${parentDir}` + info.path, { excerpt: true })
    const result = getFileData(opts, info, data, content, excerpt)
    const infoKeep = getFileInfo(opts, info, language)
    return mergeInfo ? { ...infoKeep, ...result } : _.set('info', infoKeep, result)
  }
}

const getFileSlugDefault = ({ base, ext }) => _.flow(_.replace(ext, ''), _.kebabCase)(base)

const fixFileInfo = ({ getFileSlug, parentDir }) => _.flow(
  setFieldWith('isDirectory', 'stats', (x) => x.isDirectory()),
  copy('path', 'sourcePath'),
  _.update('path', _.replace(parentDir, '')),
  ({ stats, ...rest }) => ({ ...rest, ..._.pick(['blocks', 'mtime', 'ctime', 'size'], stats) }),
  mergeFieldsWith('path', pathParse),
  setFieldWith('pathParts', 'path', _.flow(_.trimCharsStart('/'), _.split('/'))),
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
  ])),
)

// pathParams and pathParts are both an array
const pathLevelProps = _.curry((pathParams, pathParts) => _.zipObject(pathParams, pathParts.slice(0, pathParams.length)))

function saveOutput(opts) {
  const { groupBy, keyIndex, outputFilename } = opts
  const save = saveData(opts)
  return (data) => {
    const collectionIndex = _.groupBy(groupBy, data)
    const collections = _.toPairs(collectionIndex)
    return Promise.all([
      save(outputFilename, keyIndex ? collectionIndex : data),
      ...collections.map(([collectionId, items]) => save(collectionId, items)),
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
      // 'base', 'blocks', 'ctime', 'dir', 'ext', 'mtime', 'fileSlug', 'language', 'name', 'pathParts',
      // 'parentDir', 'path', 'size', 'sourcePath' ],
    inputHumps: true,
    keyIndex: true, // Output an array or an object keyed by collection.
    // groupBy: 'collection',
    mergePathProps: true, // Extracted file path properties should be added to top level data. Otherwise within `info.pathProps`.
    mergeInfo: false,
    outputDir: 'public',
    outputFilename: 'index',
    parentDir: 'content', // Where to find the collections of content.
    pathProps: ['collection'],
  }),
  addField('groupBy', _.get('pathProps[0]'))
)

export function processContentWithOpts(opts = {}) {
  const { finalProcessing, parentDir, pathProps } = opts
  return fsxtr.list(parentDir)
    .then(fixFileInfos(opts))
    .then(_.map(_.flow(
      setFieldWith('pathProps', 'pathParts', pathLevelProps(pathProps)),
      addContent(opts),
      finalProcessing,
    )))
    .then(saveOutput(opts))
    .then(() => console.log('BUILD DATA: DONE'))
}

export const processContent = _.flow(getOpts, processContentWithOpts)
export default processContent
