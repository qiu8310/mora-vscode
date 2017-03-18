import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs-extra'
import * as os from 'os'

import {REACT_PURE_COMPONENT, REACT_LIST_COMPONENT, REACT_COMPONENT_STYLE} from './snippets'

const {window, workspace, Position} = vscode
const PREFIXABLE_FOLDERS = ['uis', 'pages', 'widgets', 'layouts', 'components']
const DEFAULT_STYLE_FOLDER = 'styles'
const DEFAULT_STYLE_EXTENSION = '.scss'

export function createReactPureComponent() {
  createReactComponent(REACT_PURE_COMPONENT)
}
export function createReactListComponent() {
  createReactComponent(REACT_LIST_COMPONENT)
}

function createReactComponent(tpl) {
  const envData = getEnvData()
  const {moduleDirName} = envData

  if (isRunnable()) {
    let content = window.activeTextEditor.document.getText()
    if (content) {
      window.showInputBox({placeHolder: '请输入要创建的文件名（相对当前文件的路径，无输入则在当前文件创建）'})
        .then(input => {
          if (!input) {
            insertSnippet(tpl, envData)
          } else {
            let newFile = path.resolve(moduleDirName, input)
            fs.ensureFileSync(newFile)
            openFile(newFile, () => insertSnippet(tpl, getEnvData()))
          }
        })
    } else {
      insertSnippet(tpl, envData)
    }
  }
}

export function createReactComponentStyle() {
  if (isRunnable()) {
    const envData = getEnvData()
    const {moduleDirName, moduleName} = envData
    let styleDir = path.join(moduleDirName, DEFAULT_STYLE_FOLDER)
    let styleName = moduleName + DEFAULT_STYLE_EXTENSION
    let styleFile = path.join(styleDir, styleName)
    fs.ensureFileSync(styleFile)

    let editor = window.activeTextEditor
    let styleRef = `import './styles/${styleName}'`
    let isStyleRefExists = false
    let lastImportLineNumber = -1 // 文件中使用 import 的最后一行
    // 去掉当前文件中对样式文件引用的注释（样式引用是通过 createReactComponent 生成的）
    eachDocumentLine(editor.document, (line, lineNumber) => {
      let {text} = line
      if (text === styleRef) {
        isStyleRefExists = true
      } else if (text === `// import './styles/${styleName}'`) {
        isStyleRefExists = true
        editor.edit(eb => {
          let startPos = new vscode.Position(lineNumber, 0)
          let endPos = new vscode.Position(lineNumber, 3)
          eb.replace(new vscode.Range(startPos, endPos), '')
        })
      }

      if (/^(import|(var|let|const)\s+\w+\s+=\s+require)\b/.test(text)) lastImportLineNumber = lineNumber

      return !isStyleRefExists // 找到了就不用再找了
    })

    // 文件中没有引用样式引用的话，就手动添加引用
    if (!isStyleRefExists) {
      editor.edit(eb => eb.insert(new vscode.Position(lastImportLineNumber + 1, 0), `${os.EOL}${styleRef}${os.EOL}`))
    }

    openFile(styleFile, (doc, trimContent) => {
      if (!trimContent) insertSnippet(REACT_COMPONENT_STYLE, envData)
    })
  }
}

function openFile(file, cb: (doc: vscode.TextDocument, trimContent: string) => any) {
  workspace.openTextDocument(file).then(doc => {
    window.showTextDocument(doc).then(() => {
      cb(doc, doc.getText().trim())
    })
  })
}

function eachDocumentLine(doc: vscode.TextDocument, fn: (line: vscode.TextLine, index: number) => any) {
  let lineCount = doc.lineCount
  for (let i = 0; i < lineCount; i++) {
    if (fn(doc.lineAt(i), i) === false) break
  }
}

function isRunnable() {
  let editor = window.activeTextEditor
  if (!editor) {
    window.showErrorMessage('mora-vscode: no active text editor!')
    return false
  }

  let langId = editor.document.languageId;
  if (langId !== 'typescriptreact' && langId != 'javascriptreact') {
    window.showErrorMessage('mora-vscode: not react language!')
    return false
  }

  return true
}

function getEnvData() {
  const {fileName} = window.activeTextEditor.document
  const {rootPath} = workspace

  let parts = (rootPath ? fileName.replace(rootPath, '') : fileName).split(/\\|\//).filter(part => !!part)

  let moduleDirName = path.dirname(fileName)
  let moduleName = parts.pop().split('.').shift()
  let prefixFolder = parts.reverse().find(folder => PREFIXABLE_FOLDERS.indexOf(folder) >= 0) || ''
  let rootClassName = (prefixFolder ? prefixFolder[0] : '') + moduleName

  return {moduleDirName, moduleName, rootClassName}
}

function insertSnippet(tpl, envData, pos?: vscode.Position) {
  window.activeTextEditor.insertSnippet(makeSnippet(tpl, envData), pos)
}

function makeSnippet(tpl, envData) {
  return new vscode.SnippetString(makeText(tpl, envData))
}

function makeText(tpl, envData) {
  return tpl.replace(/\$(\w+)/g, (_, key) => {
    if (key in envData) return envData[key]
    return _
  })
}
