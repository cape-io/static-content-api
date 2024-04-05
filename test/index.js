import processContent from '../index.js'

processContent({
  parentDir: 'test/content',
  outputDir: 'test/data',
  ignoreDirs: ['other'],
  jsonArgs: {
    spaces: 2,
  },
  mergeInfo: false,
  keyIndex: true,
  requireDir: true,
  requireExt: true,
  ignoreDotFiles: true,
})
