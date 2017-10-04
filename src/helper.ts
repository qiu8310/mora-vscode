import * as vscode from 'vscode'
import * as path from 'path'
import {camel, cap, upper, snake/*, kebab */} from 'naming-transform'

const {workspace, window} = vscode
const TPL_VARABLE_REGEXP = /\$(\w+)|\$\{(\w+)\}/g

export const config = workspace.getConfiguration('mora-vscode')

export interface IEnvData {
  rootPath: string
  npmPath: string
  date: string
  time: string
  datetime: string
  user: string
  pkg: any

  fileName?: string
  dirName?: string
  extension?: string
  baseName?: string
  rawModuleName?: string
  moduleName?: string
  ModuleName?: string
  MODULE_NAME?: string
  module_name?: string
}

export function getEnvData(loadCustom: boolean = true): IEnvData {
  const rootPath = workspace.rootPath || process.cwd()

  let d = new Date()
  let pad = n => n < 10 ? '0' + n : n
  let date = [d.getFullYear(), d.getMonth() + 1, d.getDate()].map(pad).join('-')
  let time = [d.getHours(), d.getMinutes()].map(pad).join(':')

  let pkg = {}
  try { pkg = require(path.join(rootPath, 'package.json')) } catch (e) { }

  let data: IEnvData = {
    rootPath,
    npmPath: path.join(rootPath, 'node_modules'),
    date,
    time,
    datetime: date + ' ' + time,
    user: process.env.USER,
    pkg,
  }

  if (window.activeTextEditor && window.activeTextEditor.document.fileName) {
    const {fileName} = window.activeTextEditor.document
    let dirName = path.dirname(fileName)
    let extension = path.extname(fileName)
    let baseName = path.basename(fileName, extension)

    data = {
      ...data,

      fileName,
      dirName,
      extension,
      baseName,
      rawModuleName: baseName,
      moduleName: camel(baseName),
      ModuleName: cap(baseName),
      MODULE_NAME: upper(baseName),
      module_name: snake(baseName),
      // 'module-name': kebab(baseName) // module-name 不能当变量名
    }
  }

  let custom
  if (loadCustom) {
    custom = _getCustomEnvVariables(data)
  }

  return custom ? {...data, ...custom} : data
}

export function render(tpl: string, data: any): string {
  return tpl.replace(TPL_VARABLE_REGEXP, (_, key1, key2) => {
    if (key1 && (key1 in data)) return data[key1]
    if (key2 && (key2 in data)) return data[key2]
    return _
  })
}

function _getCustomEnvVariables(data: IEnvData): any {
  const generateTemplateVariableFiles = config.get<string[]>('generateTemplateVariableFiles')
  if (!generateTemplateVariableFiles.length) return

  let isTsFile = f => f.endsWith('.ts') || f.endsWith('.tsx')
  let tsEnabled = false
  if (generateTemplateVariableFiles.find(isTsFile)) {
    try {
      require(data.npmPath + '/ts-node/register')
      tsEnabled = true
    } catch (e) {
      window.showErrorMessage('can\'t find ts-node, so ts files in `generateTemplateVariableFiles` can not be compiled')
    }
  }

  let {rootPath} = workspace
  return generateTemplateVariableFiles.reduce((all, file) => {
    if (!isTsFile(file) || tsEnabled) {
      try {
        let r = require(path.resolve(rootPath, render(file, data)))
        if (r && r.default) r = r.default

        if (typeof r === 'function') r = r(vscode)
        if (r && typeof r === 'object') all = {...all, ...r}
      } catch (e) {
        window.showErrorMessage('require file ' + file + ' error: ' + e.message)
      }
    }
    return all
  }, {})
}
