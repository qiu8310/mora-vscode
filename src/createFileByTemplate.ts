import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs-extra'
import * as os from 'os'
import {camel, cap, upper, snake} from 'naming-transform'
import * as findup from 'mora-scripts/libs/fs/findup'

const {window, workspace, Position} = vscode
const TPL_VARABLE_REGEXP = /\$(\w+)|\$\{(\w+)\}/g
const config = workspace.getConfiguration('mora-vscode')

export function createScriptFile() {
  if (isRunnable()) {
    const envData = getEnvData()
    const {dirName, extension, moduleName} = envData

    let editor = window.activeTextEditor
    let content = editor.document.getText()

    if (content) {
      let {start, end} = editor.selection
      let created
      let createFile = (filepath) => {
        created = true

        let newFile = path.resolve(dirName, filepath)
        fs.ensureFileSync(newFile)
        openFile(newFile, () => insertSnippet(getTemplate(newFile), getEnvData()))
      }

      // 当前光标所在的行上引用了一个不存在的文件
      for (let lineNumber = start.line; lineNumber <= end.line; lineNumber++) {
        let lineText = editor.document.lineAt(lineNumber).text
        // 识别『 import Test from './Test' 』 和  『 const Test = require('./Test') 』
        if ( /^\s*import\s+.*?\s+from\s+'([^\)]+)'/.test(lineText) || /require\('([^\)]+)'\)/.test(lineText)) {
          let filepath = RegExp.$1

          // 必须是相对路径，并且文件不存在
          if (filepath[0] === '.' && !fs.existsSync(path.resolve(dirName, filepath))) {
            if (!(/\.\w+$/.test(filepath))) filepath += extension
            createFile(filepath)
            break
          }
        }
      }

      // 没有找到一个可以创建的文件，则提示用户输入文件路径
      if (!created) {
        window.showInputBox({placeHolder: '请输入要创建的文件名（相对当前文件的路径，无输入则在当前文件创建）'}).then(createFile)
      }
    } else if (editor.document.fileName) {
      insertSnippet(getTemplate(editor.document.fileName), envData)
    }
  }
}

export function createStyleFile() {
  if (isRunnable()) {
    const styleFileFolder = config.get<string>('styleFileFolder')
    const styleFileExtension = config.get<string>('styleFileExtension')

    const envData = getEnvData()
    const {dirName, baseName} = envData
    let styleDir = path.join(dirName, styleFileFolder)
    let styleName = baseName + styleFileExtension
    let styleFile = path.join(styleDir, styleName)
    fs.ensureFileSync(styleFile)

    let editor = window.activeTextEditor
    let style = `'./${styleFileFolder}/${styleName}'`
    let styleRef1 = `import ${style}`
    let styleRef2 = `require(${style}')`
    let styleRef3 = `import * as style from ${style}`
    let styleRef4 = `const style = require(${style})`
    let styleRefs = [styleRef1, styleRef2, styleRef3, styleRef4]

    let isStyleRefExists = false
    let lastImportLineNumber = -1 // 文件中使用 import 的最后一行

    eachDocumentLine(editor.document, (line, lineNumber) => {
      let {text} = line
      if (styleRefs.indexOf(text) >= 0) {
        isStyleRefExists = true
      } else if (text.substr(0, 3) === '// ' || styleRefs.indexOf(text.substr(3)) >= 0) {
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
      editor.edit(eb => eb.insert(new vscode.Position(lastImportLineNumber + 1, 0), `${os.EOL}${styleRef1}${os.EOL}`))
    }

    openFile(styleFile, (doc, trimContent) => {
      if (!trimContent) {
        insertSnippet(getTemplate(styleFile), envData)
      }
    })
  }
}

function getTemplate(fileName: string) {
  let extension = path.extname(fileName)
  let tplFile = extension + '.tpl'

  try {
    let tplDir = findup.dir(path.dirname(fileName), '.tpl')
    let tplDirParent = path.dirname(tplDir)
    let firstPath = fileName.replace(tplDirParent, '').substr(1).split('/').shift()
    try {
      return fs.readFileSync(path.join(tplDir, firstPath, tplFile)).toString()
    } catch(e) {
      return fs.readFileSync(path.join(tplDir, tplFile)).toString()
    }
  } catch (e) {
    return ''
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

  // let langId = editor.document.languageId;
  // if (langId !== 'typescriptreact' && langId != 'javascriptreact') {
  //   window.showErrorMessage('mora-vscode: not react language!')
  //   return false
  // }

  return true
}

function getEnvData() {
  const {fileName} = window.activeTextEditor.document
  const {rootPath} = workspace

  let dirName = path.dirname(fileName)
  let extension = path.extname(fileName)
  let baseName = path.basename(fileName, extension)

  let moduleName = baseName.replace(/_+(\w)/, (_, w) => w.toUpperCase())
  let ucModuleName = baseName.toUpperCase()
  let ufModuleName = moduleName[0].toUpperCase() + moduleName.slice(1)
  let d = new Date()
  let pad = n => n < 10 ? '0' + n : n
  let date = [d.getFullYear(), d.getMonth() + 1, d.getDate()].map(pad).join('-')
  let time = [d.getHours(), d.getMinutes()].map(pad).join(':')
  let user = process.env.USER

  return {
    fileName, dirName, rootPath, extension,
    date, time, datetime: date + ' ' + time,
    user,

    // if:    baseName     = 'hello-world'
    // then:  moduleName   = 'helloWorld'
    //        ufModuleName = 'HelloWorld'   // upper first
    //        ucModuleName = 'HELLO_WORLD'  // upper case
    //        lcModuleName = 'hello_world'  // lower case
    baseName,
    moduleName: camel(baseName),
    ufModuleName: cap(baseName),
    ucModuleName: upper(baseName),
    lcModuleName: snake(baseName),
  }
}

function insertSnippet(tpl, envData, pos?: vscode.Position) {
  window.activeTextEditor.insertSnippet(makeSnippet(tpl, envData), pos)
}

function makeSnippet(tpl, envData) {
  return new vscode.SnippetString(makeText(tpl, envData))
}

function makeText(tpl, envData) {
  return tpl.replace(TPL_VARABLE_REGEXP, (_, key1, key2) => {
    if (key1 && (key1 in envData)) return envData[key1]
    if (key2 && (key2 in envData)) return envData[key2]
    return _
  })
}
