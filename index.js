import _ from 'lodash/fp.js'
import { isFalse, neq } from 'understory'
import humps from 'lodash-humps'
import { copy, mergeFieldsWith, propDo, setField, setFieldWith } from 'prairie'
import matter from 'gray-matter'
import { promises as fsxtr } from 'fs-extender'
import pathParse from 'path-parse'
import fse from 'fs-extra'

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
  const { keyIndex, outputFilename = 'index', outputDir, parentDir } = opts
  const getPath = (name, ext = 'json') => `${outputDir}/${parentDir}/${name}.${ext}`
  return (data) => {
    const collection = _.groupBy('info.collection', data)

    const collections = _.toPairs(collection)
    return Promise.all([
      fse.outputJSON(getPath(outputFilename), keyIndex ? collection : data),
      ...collections.map(([collectionId, items]) => fse.outputJSON(getPath(collectionId), items)),
    ])
  }
}

const getOpts = _.defaults({
  mergePathProps: true,
  mergeInfo: false,
  outputDir: 'public',
  parentDir: 'content',
  pathProps: ['collection'],
})

function processContent(options) {
  const opts = getOpts(options)
  const { parentDir, pathProps } = opts
  return fsxtr.list(parentDir)
    .then(fixFileInfos(opts))
    .then(_.map(_.flow(
      setFieldWith('pathProps', 'pathParts', pathLevelProps(pathProps)),
      addContent(opts),
    )))
    .then(saveOutput(opts))
    .then(() => console.log('BUILD DATA: DONE'))
}
export default processContent
