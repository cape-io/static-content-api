# static-content-api

Read directories of markdown and yaml files and output some json. Does not process markdown into html (yet?).

## Outputs

Keys are sorted so files are more git friendly if tracking changes. Try `jsonArgs: { spaces: 2 }` in options to make commits cleaner.

### Index Summary File

Creates a big file with all the content of all the content types.

### Collection Files

A file with just the items from that collection or content type.

### Schema File

Creates a json-schema file based on the input.

### OpenAPI File

Future: Creates an openapi file based on the input.

## Example Usage

```javascript
import processContent from "static-content-api";

processContent({
  parentDir: 'content',
  outputDir: 'public/data',
})
```

## Options

```javascript
{
  customSortVals: {
    id: '!',
  },
  // fieldSorter: () => {},
  jsonArgs: {
    // spaces: 2,
  },
  // fields: [
    // 'base', 'blocks', 'ctime', 'dir', 'ext', 'mtime', 'fileSlug', 'language', 'name', 'pathParts',
    // 'parentDir', 'path', 'size', 'sourcePath' ],
  keyIndex: true, // Output "Summary File" an array or an object keyed by collection.
  // groupBy: 'collection',
  ignoreDirs: ['/.config'],
  mergePathProps: true, // Extracted file path properties should be added to top level data. Otherwise within `info.pathProps`.
  mergeInfo: false,
  outputDir: 'public',
  outputFilename: 'index',
  parentDir: 'content', // Where to find the collections of content.
  pathProps: ['collection'],
}
```

## Process specific data files

processDataFile()

## Other Similar Projects

* https://github.com/tscanlin/processmd
* https://github.com/klaytonfaria/markdown-json
* https://github.com/eduardoboucas/static-api-generator
* https://github.com/hellotoby/metalsmith-to-json

