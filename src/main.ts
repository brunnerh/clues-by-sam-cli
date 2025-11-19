/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import { context } from './context.ts';
import { parseArgs } from '@std/cli/parse-args';
import { executeClientCommand } from './client.ts';
import { startServer } from './server.ts';

if (Deno.args.includes('--debug')) {
	Deno.args.splice(Deno.args.indexOf('--debug'), 1);
	context.debug = true;
}

if (Deno.args.includes('--no-headless')) {
	Deno.args.splice(Deno.args.indexOf('--no-headless'), 1);
	context.headless = false;
}

const { server, port: portString, board: showNewBoard, _: args } = parseArgs(
	Deno.args,
	{
		boolean: ['server', 'board'],
		string: ['port'],
		alias: {
			server: 's',
			port: 'p',
			board: 'b',
		},
	},
);

context.port = Number(portString ?? Deno.env.get('PORT') ?? '8080');

if (server)
	startServer();
else
	await executeClientCommand({ showNewBoard, args });
