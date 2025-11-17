/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import puppeteer, { type ElementHandle } from 'puppeteer';
import { context } from './context.ts';
import { dim, green, red } from '@std/fmt/colors';
import { parseArgs } from '@std/cli/parse-args';
import { delay } from './async.ts';

if (Deno.args.includes('--debug')) {
	Deno.args.splice(Deno.args.indexOf('--debug'), 1);
	context.debug = true;
}

if (Deno.args.includes('--no-headless')) {
	Deno.args.splice(Deno.args.indexOf('--no-headless'), 1);
	context.headless = false;
}

let webSocketEndpoint: string;
let httpServer: Deno.HttpServer;
const encoder = new TextEncoder();

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

const port = Number(portString ?? Deno.env.get('PORT') ?? '8080');

if (server)
	startServer();
else
	await executeCommand();

async function executeCommand() {
	const base = `http://localhost:${port}`;
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
				console.log(`Starting server on port ${port}...`);
				const p = new Deno.Command('clues-by-sam-cli', {
					args: [
						'--server',
						'--port=' + port,
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

function startServer() {
	httpServer = Deno.serve(
		{
			port,
			hostname: 'localhost',
			onListen() {
				console.log(`Server running on http://localhost:${port}/`);
			},
		},
		(request) => {
			const { pathname } = new URL(request.url);
			const { method } = request;

			const route = method + pathname;
			console.log(new Date().toISOString() + ' ' + route);
			switch (route) {
				case 'POST/stop':
					return handleStopRequest();
				case 'GET/board':
					return handleStatusRequest();
				case 'POST/set':
					return handleSetRequest(request);
				default:
					return new Response('Not Found: ' + route, { status: 404 });
			}
		},
	);
}

async function handleStopRequest() {
	await shutdown();

	return new Response('Server stopped.');
}

async function shutdown() {
	const browser = await getBrowser(false);
	if (browser != null)
		await browser.close();

	httpServer.shutdown();
}

async function handleStatusRequest() {
	const page = await getPage();
	const state = await getState(page);

	return new Response(encoder.encode(printState(state)));
}

async function handleSetRequest(request: Request) {
	const fromData = await request.formData();
	const coordinate = fromData.get('coordinate') as string | null;
	const status = fromData.get('status') as Exclude<Status, 'unknown'> | null;
	const board = fromData.get('board') == 'true';

	if (coordinate == null || status == null) {
		return new Response('Bad Request: Missing coordinate or status', {
			status: 400,
		});
	}
	if (status !== 'innocent' && status !== 'criminal')
		return new Response('Bad Request: Invalid status', { status: 400 });

	const page = await getPage();
	const card = await page.evaluateHandle(
		(coordinate) =>
			[...document.querySelectorAll('.card-grid .card-container')]
				.find((container) =>
					container.querySelector('.coord')
						?.textContent
						?.trim()
						.toLowerCase() == coordinate.toLowerCase()
				),
		coordinate,
	) as ElementHandle<HTMLDivElement>;

	const cardStatus = await card.evaluate((e) => {
		if (e == null)
			return null;

		const cardBack = e.querySelector('.card-back');
		return cardBack?.classList.contains('innocent')
			? 'innocent'
			: cardBack?.classList.contains('criminal')
			? 'criminal'
			: 'unknown';
	});

	if (cardStatus == null) {
		return new Response('Not Found: No suspect at ' + coordinate, {
			status: 404,
		});
	}

	if (cardStatus != 'unknown') {
		return new Response(
			'Conflict: Suspect already has known status: ' + cardStatus,
			{ status: 400 },
		);
	}

	await card.click();
	card.dispose();

	const button = {
		innocent: '.btn-innocent',
		criminal: '.btn-criminal',
	}[status];
	await page.locator(button).click();

	await delay(100);
	const mistakeDialog = await page.$('.modal.warning');
	if (mistakeDialog != null) {
		const continueButton = await mistakeDialog.$('.btn-warn');
		if (continueButton == null) {
			throw new Error(
				'Cannot find continue button in mistake dialog.' +
					' Page structure may have changed.',
			);
		}

		await continueButton.click();

		return new Response('Mistake - Not enough evidence.');
	}
	else {
		const newState = await getState(page);

		const finished = newState.every((c) => c.status !== 'unknown');
		if (finished == false) {
			if (board)
				return new Response(encoder.encode(printState(newState)));
			else {
				const updatedCard = newState.find((c) =>
					c.coordinate.toLowerCase() === coordinate.toLowerCase()
				)!;

				const output = [
					`Correctly marked ${updatedCard.name} (${updatedCard.coordinate}) as ${status}.`,
					'New clue:',
					`${updatedCard.name}: ${updatedCard.hint}`,
				].join('\n');

				return new Response(encoder.encode(output));
			}
		}

		await page.locator('.modal.complete').wait();
		const results = await page.evaluate(() => {
			const dialog = document.querySelector('.modal.complete');
			const h3 = dialog?.querySelectorAll('h3');
			const title = h3?.[0].textContent;
			const time = h3?.[1].textContent;
			const rows = [...dialog?.querySelectorAll('.share-grid-row') ?? []]
				.map((row) =>
					[...row.querySelectorAll('.share-grid-element')].map((e) =>
						e.classList.contains('correct')
					)
				);

			return { title, time, rows };
		});

		const output = [
			printState(newState),
			'',
			'Game Complete',
			results.title + ' - ' + results.time,
			...results.rows.map((row) =>
				row.map((correct) => (correct ? '🟩' : '🟨')).join('')
			),
		].join('\n');

		await shutdown();

		return new Response(encoder.encode(output));
	}
}

function printState(state: CardState[]) {
	const mapped = state.map((c) => ({
		...c,
		lines: [
			c.coordinate,
			c.name,
			c.profession,
			c.status,
		].filter(Boolean),
	}));

	const columns = Object.groupBy(
		mapped,
		(c) => c.coordinate.substring(0, 1),
	);
	const columnWidths = Object.fromEntries(
		Object.entries(columns).map(([column, cards]) => {
			const width = Math.max(
				...cards!.map((c) => Math.max(...c.lines.map((l) => l.length))),
			);

			return [column, width];
		}),
	);

	const output: string[] = [];
	for (const y of ['1', '2', '3', '4', '5']) {
		const line = ['A', 'B', 'C', 'D']
			.map((x) => state.find((c) => c.coordinate === x + y)!);

		const blocks = line.map((card) => {
			const width = columnWidths[card.coordinate.substring(0, 1)];
			const pad = (s: string) => s.padEnd(width, ' ');
			const color = card.status === 'innocent'
				? green
				: card.status === 'criminal'
				? red
				: dim;

			const lines = [
				dim(pad(card.coordinate)),
				color(pad(card.name)),
				color(pad(card.profession)),
				color(pad(card.status)),
			];

			return lines;
		});

		for (let i = 0; i < 4; i++) {
			output.push(
				blocks.map((b) => b[i]).join('   '),
			);
		}

		output.push('');
	}

	output.push('Clues:');
	for (const card of state) {
		if (card.hint != null) {
			output.push(
				`${card.name}: ${card.hint}`,
			);
		}
	}

	return output.join('\n');
}

async function getState(page: puppeteer.Page) {
	return await page.evaluate(() =>
		[...document.querySelectorAll('.card-grid .card-container')]
			.map((container) => {
				// @ts-ignore No TS in page code
				const text = (e) => e?.textContent?.trim() ?? null;

				const cardBack = container.querySelector('.card-back');
				const status = cardBack?.classList.contains('innocent')
					? 'innocent'
					: cardBack?.classList.contains('criminal')
					? 'criminal'
					: 'unknown';

				return {
					coordinate: text(container.querySelector('.coord')),
					name: text(container.querySelector('.name')),
					profession: text(container.querySelector('.profession')),
					hint: text(container.querySelector('.hint')),
					status,
				};
			})
	) as any as CardState[];
}

async function getBrowser(autoLaunch = true) {
	let browser;
	try {
		browser = await puppeteer.connect({
			browserWSEndpoint: webSocketEndpoint,
		});
	}
	catch {
		if (context.debug) {
			console.debug(
				'Failed to reconnect, launching new browser instance...',
			);
		}

		if (autoLaunch) {
			browser = await puppeteer.launch({
				headless: context.headless ? 'shell' : false,
				defaultViewport: context.headless
					? { width: 1280, height: 800 }
					: null,
			});
			webSocketEndpoint = browser.wsEndpoint();
		}
	}

	return browser;
}

async function getPage() {
	const browser = (await getBrowser())!;
	const url = 'https://cluesbysam.com';
	const pages = await browser.pages();
	const existing = pages.find((p) => p.url().startsWith(url));
	if (existing != null)
		return existing;

	const page = await browser.newPage();
	try {
		await page.goto(url);
		await page.locator('button.start').click();

		return page;
	}
	catch {
		console.error('Failed to load cluesbysam.com');
		await page.close();
		Deno.exit(1);
	}
}

interface CardState {
	coordinate: string;
	name: string;
	profession: string;
	hint: string | null;
	status: Status;
}

type Status = 'innocent' | 'criminal' | 'unknown';
