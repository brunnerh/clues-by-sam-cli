/**
 * @module
 * Execution of commands with the application acting as a client.
 */

import { context } from './context.ts';

export async function executeClientCommand(options: ExecuteCommandOptions) {
	const { args, showNewBoard } = options;

	const base = `http://localhost:${context.port}`;
	const [command, ...commandArgs] = args.map((a) =>
		a.toString().toLowerCase()
	);

	if (command == null) {
		const lines = [
			'Usage: clues-by-sam-cli <command> [args] [options]',
			'',
			'Commands:',
			'  start                  Start the game server as a background process and get the',
			'                         initial game board state.',
			'                         (The server shuts down automatically upon game completion.)',
			'  stop                   Stop the game server.',
			'  board                  Show current game board.',
			'  innocent <coordinate>  Mark suspect at coordinate as innocent.',
			'  criminal <coordinate>  Mark suspect at coordinate as criminal.',
			'                         Options:',
			'                           -b, --board  Show full game board after marking suspect.',
			'',
			'Options:',
			'  -s, --server           Run in server mode',
			'  -p, --port <port>      Port to use',
			'                         Default: PORT environment variable or 8080',
			'      --debug            Enable debug mode',
			'      --no-headless      Run browser in non-headless mode',
		];
		console.log(lines.join('\n'));
		Deno.exit(0);
	}
	switch (command) {
		case 'start':
			{
				console.log(`Starting server on port ${context.port}...`);
				const p = new Deno.Command('clues-by-sam-cli', {
					args: [
						'--server',
						'--port=' + context.port,
						context.headless ? '' : '--no-headless',
					],
					detached: true,
				});

				p.spawn();

				const response = await fetch(base + '/board');
				const text = await response.text();
				console.log(text);

				Deno.exit(0);
			}
			break;
		case 'stop':
			{
				console.log('Stopping server...');
				const response = await fetch(base + '/stop', {
					method: 'POST',
				});
				const text = await response.text();
				console.log(text);
			}
			break;
		case 'board':
			{
				const response = await fetch(base + '/board');
				const text = await response.text();
				console.log(text);
			}
			break;
		case 'innocent':
		case 'criminal':
			{
				const coordinate = commandArgs[0];
				if (coordinate == null) {
					console.error('Please provide a coordinate (e.g., A1).');
					Deno.exit(1);
				}

				const response = await fetch(`${base}/set`, {
					method: 'POST',
					body: new URLSearchParams({
						coordinate: coordinate.toLowerCase(),
						status: command,
						board: showNewBoard.toString(),
					}),
				});
				const text = await response.text();
				console.log(text);
			}
			break;
	}
}

export interface ExecuteCommandOptions {
	/** Positional arguments. */
	args: (string | number)[];

	/** Whether to show the new board after marking a suspect. */
	showNewBoard: boolean;
}
