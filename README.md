# static-content-api

## Options

```javascript
  // fields: [
    // 'base', 'blocks', 'ctime', 'dir', 'ext', 'mtime', 'fileSlug', 'language', 'name', 'pathParts',
    // 'parentDir', 'path', 'size', 'sourcePath' ],
  keyIndex: true, // Output an array or an object keyed by collection.
  groupBy: 'collection',
  mergePathProps: true, // Extracted file path properties should be added to top level data. Otherwise within `info.pathProps`.
  mergeInfo: false,
  outputDir: 'public',
  outputFilename: 'index',
  parentDir: 'content', // Where to find the collections of content.
  pathProps: ['collection'],
```

## Other Similar Projects

* https://github.com/tscanlin/processmd
* https://github.com/klaytonfaria/markdown-json
* https://github.com/eduardoboucas/static-api-generator

