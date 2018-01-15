import * as vscode from 'vscode'
import * as path from 'path'

const {workspace} = vscode
const TPL_VARABLE_REGEXP = /\$(\w+)|\$\{(\w+)\}/g

export const rootPath = workspace.rootPath || process.cwd()

export interface IEnvData {
  rootPath: string
  npmPath: string
}

export function getEnvData(): IEnvData {

  return {
    rootPath,
    npmPath: path.join(rootPath, 'node_modules')
  }
}

export function render(tpl: string, data: any): string {
  return tpl.replace(TPL_VARABLE_REGEXP, (_, key1, key2) => {
    if (key1 && (key1 in data)) return data[key1]
    if (key2 && (key2 in data)) return data[key2]
    return _
  })
}


