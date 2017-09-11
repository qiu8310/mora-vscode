import { CompletionItemProvider, TextDocument, Position, CompletionItem, workspace, Range, CompletionItemKind } from 'vscode';
import * as fs from 'fs-extra'
import * as path from 'path'


const jsxRegexp = /className=["|']([\w- ]*$)/
const styleFileRegExp = /import\s+['"](.*?)['"]|require\(['"](.*?)['"]\)/
const styleRegexp = /\.[a-zA-Z][\w-\d_]*/g

export class ClassCompletion implements CompletionItemProvider {
  fileCache: any = {}
  config = {
    globalStyleFiles: []
  }
  constructor(public classRegexp = jsxRegexp) {
    this.config = this.normalizeConfig(workspace.getConfiguration('mora-vscode') as any)
  }
  normalizeConfig(config) {
    let replace = (str) => {
      let root = workspace.rootPath || __dirname
      return str
        .replace(/\$\{root\}/g, root)
        .replace(/\$\{npm\}/g, path.join(root, 'node_modules'))
    }

    let globalStyleFiles = config.globalStyleFiles.map(replace)
    return {globalStyleFiles}
  }

  provideCompletionItems(document: TextDocument, position: Position): CompletionItem[] {
    const start: Position = new Position(position.line, 0)
    const range: Range = new Range(start, position)
    const text: string = document.getText(range)

    const rawClasses: RegExpMatchArray = text.match(this.classRegexp)
    if (!rawClasses || rawClasses.length === 1) {
        return []
    }

    let styles = [...this.getGlobalStyles(), ...this.getCurrentStyels(document.getText())]

    // 去除已经存在的 classes
    let classesOnAttribute = rawClasses[1].split(' ')
    if (classesOnAttribute.length) {
      styles = styles.filter(cls => classesOnAttribute.indexOf(cls) < 0)
    }

    // 去重
    let cache = {}
    styles = styles.filter(s => {
      if (cache[s]) return false
      cache[s] = true
      return true
    })

    return styles.map(s => new CompletionItem(s.substr(1), CompletionItemKind.Variable))
  }

  getGlobalStyles() {
    return this.getStylesFromFiles(this.config.globalStyleFiles)
  }

  getCurrentStyels(content: string) {
    let styleFiles = []
    content.replace(styleFileRegExp, (r, r1, r2, index) => {
      styleFiles.push(r1 || r2)
      return r
    })
    return this.getStylesFromFiles(styleFiles)
  }

  getStylesFromFiles(files: string[]): string[] {
    return files.reduce((styles, file) => {
      styles.push(...this.getStylesFromFile(file))
      return styles
    }, [])
  }

  getStylesFromFile(file: string): string[] {
    file = path.resolve(file)

    try {
      let cache = this.fileCache[file]
      let stat = fs.statSync(file)
      if (cache && stat.mtime <= cache.mtime) {
        return cache.value
      }

      let fileContent = fs.readFileSync(file).toString()
        .replace(/\/\/.*/g, '')
        .replace(/\/\*[\s\S]*?\*\//, '')

      cache = {
        mtime: stat.mtime,
        value: fileContent.match(styleRegexp)
      }

      return cache.value
    } catch (e) {
      return []
    }
  }
}
