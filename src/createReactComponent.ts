import * as vscode from 'vscode'
import {REACT_PURE_COMPONENT, REACT_LIST_COMPONENT, REACT_COMPONENT_STYLE} from './snippets'

const {window} = vscode
const PREFIXABLE_FOLDERS = ['uis', 'pages', 'widgets', 'layouts', 'components']

export function createReactPureComponent() {
  createReactComponent(REACT_PURE_COMPONENT)
}
export function createReactListComponent() {
  createReactComponent(REACT_LIST_COMPONENT)
}
export function createReactComponentStyle() {
  if (isRunnable()) {

  }
}

function createReactComponent(tpl) {
  if (isRunnable()) {
    let editor = window.activeTextEditor
    editor.insertSnippet(makeSnippet(tpl, getEnvData()), editor.selection.end)
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
  const {rootPath} = vscode.workspace

  let parts = (rootPath ? fileName.replace(rootPath, '') : fileName).split(/\\|\//).filter(part => !!part)

  let moduleName = parts.pop().split('.').shift()
  let prefixFolder = parts.reverse().find(folder => PREFIXABLE_FOLDERS.indexOf(folder) >= 0) || ''
  let rootClassName = (prefixFolder ? prefixFolder[0] : '') + moduleName

  return {moduleName, rootClassName}
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
