#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';
import meow from 'meow';
import App from './app.js';
import {ensureDirectories} from './utils/ensureDirectories.js';

// Ensure application directories exist
ensureDirectories();

const cli = meow(
	`
	Usage
	  $ arxiv-reader --query <query>
`,
	{
		importMeta: import.meta,
		flags: {
			query: {
				type: 'string',
			},
		},
	},
);

import {queryClient} from './constants/index.js';
import {QueryClientProvider} from '@tanstack/react-query';

// Clear the terminal and enable alternate screen buffer
console.clear();
process.stdout.write('\x1b[?1049h'); // Enter alternate screen buffer
process.stdout.write('\x1b[?25l'); // Hide cursor

const inkApp = render(
	<QueryClientProvider client={queryClient}>
		<App query={cli.flags.query ?? 'LLMs'} />
	</QueryClientProvider>,
	{
		exitOnCtrlC: true,
	},
);

// Restore normal terminal state when the app exits
inkApp.waitUntilExit().then(() => {
	process.stdout.write('\x1b[?25h'); // Show cursor
	process.stdout.write('\x1b[?1049l'); // Exit alternate screen buffer
});
