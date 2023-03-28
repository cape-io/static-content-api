import _ from 'lodash/fp.js'
import humps from 'lodash-humps'
import matter from 'gray-matter'
import { unified } from 'unified'
import markdown from 'remark-parse'
import { selectAll } from 'unist-util-select'
import { Slugger } from 'marked'

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

export function getFileInfo({ fields, mergePathProps }, info, language) {
  const infoKeep = fields ? _.pick(fields, info) : _.omit(['isDirectory', 'root'], info)
  infoKeep.language = language
  if (mergePathProps) delete infoKeep.pathProps
  return infoKeep
}
export function getFileData({ mergePathProps }, info, data, content, excerpt) {
  const result = mergePathProps ? { ...humps(data), ...info.pathProps } : humps(data)
  if (content) {
    result.content = _.trim(content)
    result.excerpt = excerpt || null
    result.headings = getHeadings(content)
  }
  // Create a default id field.
  if (!result.id) result.id = info.fileSlug
  return result
}

export function addContent(opts) {
  const { mergeInfo, parentDir } = opts
  return (info) => {
    const {
      data, content, excerpt, language,
    } = matter.read(`./${parentDir}${info.path}`, { excerpt: true })
    const result = getFileData(opts, info, data, content, excerpt)
    const infoKeep = getFileInfo(opts, info, language)
    return mergeInfo ? { ...infoKeep, ...result } : _.set('info', infoKeep, result)
  }
}
