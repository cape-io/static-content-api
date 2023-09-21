import processContent from '../index.js'

processContent({
  parentDir: 'test/content',
  outputDir: 'test/data',
  jsonArgs: {
    spaces: 2,
  },
  mergeInfo: false,
  keyIndex: true,
})
