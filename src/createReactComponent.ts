import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs-extra'
import * as os from 'os'

import {
  REACT_PURE_COMPONENT, REACT_LIST_COMPONENT, REACT_COMPONENT_STYLE,
  REACT_PURE_PAGE_COMPONENT, REACT_PURE_ADMIN_PAGE_COMPONENT, REACT_LIST_PAGE_COMPONENT
} from './snippets'

const {window, workspace, Position} = vscode
const PREFIXABLE_FOLDERS = ['uis', 'pages', 'page', 'widgets', 'widget', 'layouts', 'components']
const DEFAULT_STYLE_FOLDER = 'styles'
const DEFAULT_STYLE_EXTENSION = '.scss'

export function createReactPureComponent() {
  const envData = getEnvData()
  const {prefixFolder, isAdmin} = envData
  createReactComponent(prefixFolder === 'pages' ? isAdmin ?  REACT_PURE_ADMIN_PAGE_COMPONENT : REACT_PURE_PAGE_COMPONENT : REACT_PURE_COMPONENT, envData)
}
export function createReactListComponent() {
  const envData = getEnvData()
  const {prefixFolder} = envData
  createReactComponent(prefixFolder === 'pages' ?  REACT_LIST_PAGE_COMPONENT : REACT_LIST_COMPONENT, envData)
}

function createReactComponent(tpl, envData) {
  const {moduleDirName, moduleExtension} = envData

  if (isRunnable()) {
    let editor = window.activeTextEditor
    let content = editor.document.getText()
    if (content) {
      let {start, end} = editor.selection
      let created
      let createFile = (filepath) => {
        created = true
        if (!filepath) {
          insertSnippet(tpl, envData)
        } else {
          let newFile = path.resolve(moduleDirName, filepath)
          fs.ensureFileSync(newFile)
          openFile(newFile, () => insertSnippet(tpl, getEnvData()))
        }
      }

      // 当前光标所在的行上引用了一个不存在的文件
      for (let lineNumber = start.line; lineNumber <= end.line; lineNumber++) {
        let lineText = editor.document.lineAt(lineNumber).text
        // 识别『 import Test from './Test' 』 和  『 const Test = require('./Test') 』
        if ( /^\s*import\s+.*?\s+from\s+'([^\)]+)'/.test(lineText) || /require\('([^\)]+)'\)/.test(lineText)) {
          let filepath = RegExp.$1
          // 必须是相对路径，并且文件不存在
          if (filepath[0] === '.' && !fs.existsSync(path.resolve(moduleDirName, filepath))) {
            if (!(/\.\w+$/.test(filepath))) filepath += moduleExtension
            createFile(filepath)
            break
          }
        }
      }

      // 没有找到一个可以创建的文件，则提示用户输入文件路径
      if (!created) {
        window.showInputBox({placeHolder: '请输入要创建的文件名（相对当前文件的路径，无输入则在当前文件创建）'}).then(createFile)
      }
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

  let isAdmin = parts.indexOf('admin') > 0
  let moduleDirName = path.dirname(fileName)
  let moduleExtension = path.extname(fileName)
  let moduleName = parts.pop().split('.').shift()
  let prefixFolder = parts.reverse().find(folder => PREFIXABLE_FOLDERS.indexOf(folder) >= 0) || ''
  let rootClassName = (prefixFolder ? prefixFolder[0] : '') + moduleName

  return {moduleDirName, moduleName, moduleExtension, rootClassName, prefixFolder, isAdmin}
}

function insertSnippet(tpl, envData, pos?: vscode.Position) {
  window.activeTextEditor.insertSnippet(makeSnippet(tpl, envData), pos)
}

function makeSnippet(tpl, envData) {
  return new vscode.SnippetString(makeText(tpl, envData))
}

function makeText(tpl, envData) {
  return tpl.replace(/\$(\w+)|\$\{(\w+)\}/g, (_, key1, key2) => {
    if (key1 && (key1 in envData)) return envData[key1]
    if (key2 && (key2 in envData)) return envData[key2]
    return _
  })
}
