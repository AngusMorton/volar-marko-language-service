import { InitializationOptions } from '@volar/language-server';
import * as serverProtocol from '@volar/language-server/protocol';
import { activateAutoInsertion, createLabsInfo, getTsdk } from '@volar/vscode';
import * as vscode from 'vscode';
import * as lsp from 'vscode-languageclient/node';

let client: lsp.BaseLanguageClient;

export async function activate(context: vscode.ExtensionContext) {

	const serverModule = vscode.Uri.joinPath(context.extensionUri, 'dist', 'server.js');
	const runOptions = { execArgv: <string[]>[] };
	const debugOptions = { execArgv: ['--nolazy', '--inspect=' + 6009] };
	const serverOptions: lsp.ServerOptions = {
		run: {
			module: serverModule.fsPath,
			transport: lsp.TransportKind.ipc,
			options: runOptions
		},
		debug: {
			module: serverModule.fsPath,
			transport: lsp.TransportKind.ipc,
			options: debugOptions
		},
	};
	const initializationOptions: InitializationOptions = {
		typescript: {
			tsdk: (await getTsdk(context)).tsdk,
		},
	};
	const clientOptions: lsp.LanguageClientOptions = {
		documentSelector: [{ language: 'marko' }],
		initializationOptions,
	};
	client = new lsp.LanguageClient(
		'marko-language-server',
		'Marko Language Server',
		serverOptions,
		clientOptions,
	);
	await client.start();

	// support for auto close tag
	activateAutoInsertion('marko', client);

	// support for https://marketplace.visualstudio.com/items?itemName=johnsoncodehk.volarjs-labs
	// ref: https://twitter.com/johnsoncodehk/status/1656126976774791168
	const labsInfo = createLabsInfo(serverProtocol);
	labsInfo.addLanguageClient(client);
	return labsInfo.extensionExports;
}

export function deactivate(): Thenable<any> | undefined {
	return client?.stop();
}
