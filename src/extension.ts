'use strict'

import * as vscode from 'vscode'
// import {WordCounter, WordCounterController} from './WordCounter'
import {createReactListComponent, createReactPureComponent, createReactComponentStyle} from './createReactComponent'
import {ClassCompletion} from './ClassCompletion'

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "mora-vscode" is now active!')

  let cc = new ClassCompletion()
  let classTriggerChars = ['"', '\'', ' ']

  // Add to a list of disposables which are disposed when this extension is deactivated.
  context.subscriptions.push(
    // new WordCounterController(new WordCounter()),
    // vscode.commands.registerCommand('extension.sayHello', () => vscode.window.showInformationMessage('Hello World!')),
    vscode.languages.registerCompletionItemProvider('typescriptreact', cc, ...classTriggerChars),
    vscode.languages.registerCompletionItemProvider('javascriptreact', cc, ...classTriggerChars),
    vscode.commands.registerCommand('extension.createReactListComponent', createReactListComponent),
    vscode.commands.registerCommand('extension.createReactPureComponent', createReactPureComponent),
    vscode.commands.registerCommand('extension.createReactComponentStyle', createReactComponentStyle)
  )
}

// this method is called when your extension is deactivated
export function deactivate() {
}
