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

const inkApp = render(
	<QueryClientProvider client={queryClient}>
		<App query={cli.flags.query ?? 'LLMs'} />
	</QueryClientProvider>,
);

await inkApp.waitUntilExit();
