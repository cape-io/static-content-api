import _ from 'lodash/fp.js'
import { mergeFieldsWith, setFieldWith } from 'prairie'

// Split a filename into [dir, root, basename, name, ext], unix version
// 'root' is just a slash, or nothing.
// eslint-disable-next-line no-var, no-useless-escape
var splitPathRe = /^((\/?)(?:[^\/]*\/)*)((\.{1,2}|[^\/]+?|)(\.[^.\/]*|))[\/]*$/

function splitPath(filename) {
  return splitPathRe.exec(filename).slice(1)
}

export function pathParse(pathString) {
  if (typeof pathString !== 'string') {
    throw new TypeError(
      `Parameter 'pathString' must be a string, not ${typeof pathString}`,
    )
  }
  const allParts = splitPath(pathString)
  if (!allParts || allParts.length !== 5) {
    throw new TypeError(`Invalid path '${pathString}'`)
  }

  return {
    root: allParts[1],
    dir: allParts[0].slice(0, -1),
    base: allParts[2],
    ext: allParts[4],
    name: allParts[3],
  }
}

// pathParams and pathParts are both an array
export const pathLevelProps = _.curry(
  (pathParams, pathParts) => _.zipObject(pathParams, pathParts.slice(0, pathParams.length)),
)
export const addPathProps = (pathProps) => setFieldWith('pathProps', 'pathParts', pathLevelProps(pathProps))

export const getPathInfo = _.flow(
  pathParse,
  setFieldWith('dirParts', 'dir', _.split('/')),
)
export const addPathParts = setFieldWith('pathParts', 'path', _.flow(_.trimCharsStart('/'), _.split('/')))
export const mergePath = mergeFieldsWith('path', pathParse)
export const addPathInfo = _.flow(mergePath, addPathParts)

export const withExt = (path, ext) => (!ext || _.endsWith(ext, path) ? path : `${path}.${ext}`)
export const getOutPath = ({ outputDir }) => (path, ext) => (path ? `${outputDir}/${withExt(path, ext)}` : outputDir)

export function getOutPathWithExt(opts, ext) {
  const getPathFunc = getOutPath(opts)
  return (path) => getPathFunc(path, ext)
}
