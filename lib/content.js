import _ from 'lodash/fp.js'
import humps from 'lodash-humps'
import matter from 'gray-matter'
import { unified } from 'unified'
import markdown from 'remark-parse'
import { selectAll } from 'unist-util-select'
import { Slugger } from 'marked'
import { loadYaml } from './utils.js'

const markdownParser = unified().use(markdown)

function getTitle(node) {
  const {
    children, type, value, url,
  } = node
  if (type === 'text') return { title: value }
  if (type === 'link') {
    return { title: children[0].value, url }
  }
  return null
}
const getHeadingInfo = (slugger) => ({ children, depth }) => {
  const { title, url } = getTitle(children[0])
  return {
    depth,
    title,
    id: title ? slugger.slug(title) : null,
    url,
    // kebab: _.kebabCase(children[0].value),
  }
}

function getHeadings(content) {
  const slugger = new Slugger() // statefull. Need new on each content.
  const ast = markdownParser.parse(content)
  const headers = selectAll('heading', ast)
  // console.log(headers.map(_.get('children')))
  return headers.map(getHeadingInfo(slugger))
}

export function getFileInfo(input) {
  const { opts: { fields }, info } = input
  const infoKeep = fields ? _.pick(fields, info) : _.omit(['isDirectory', 'root'], info)
  return _.set('info', infoKeep, input)
}

// move pathProps from info and merge into result.
function handlePathProps(input) {
  if (!input.opts.mergePathProps) return input
  const { opts, result, info: { pathProps, ...info } } = input
  return {
    opts,
    info,
    result: {
      ...result,
      ...pathProps,
    },
  }
}

function processYaml(input) {
  const { opts: { parentDir }, info: { path } } = input
  return loadYaml({}, `./${parentDir}${path}`)
    .then((data) => _.set('result', data, input))
}

export function getFileData(info, data, content, excerpt) {
  const result = humps(data)
  if (content) {
    result.content = _.trim(content)
    result.excerpt = excerpt || null
    result.headings = getHeadings(content)
  }
  return result
}

function processMarkdown({ opts, info }) {
  const { parentDir } = opts
  const {
    data, content, excerpt, language,
  } = matter.read(`./${parentDir}${info.path}`, { excerpt: true })
  return {
    opts,
    result: getFileData(info, data, content, excerpt),
    info: { ...info, language },
  }
}

function processFile(input) {
  if (input.info.ext === '.yaml') {
    return processYaml(input)
  }
  return Promise.resolve(processMarkdown(input))
}

// Create a default id field.
function setId(input) {
  if (input.result.id) return input
  return _.set('result.id', input.info.fileSlug, input)
}
// This is last.
function infoMerge({ opts: { mergeInfo }, result, info }) {
  return mergeInfo ? { ...info, ...result } : _.set('info', info, result)
}

export function addContent(opts) {
  return (info) => processFile({ opts, info })
    .then(getFileInfo)
    .then(handlePathProps)
    .then(setId)
    .then(infoMerge)
}
