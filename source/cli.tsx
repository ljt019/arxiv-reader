#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';
import meow from 'meow';
import App from './app.js';

// @ts-ignore: Who cares? xd
const cli = meow(
	`
	Usage
	  $ my-ink-cli
`,
	{
		importMeta: import.meta,
		flags: {
			name: {
				type: 'string',
			},
		},
	},
);

import {queryClient} from './constants/index.js';
import {QueryClientProvider} from '@tanstack/react-query';

const inkApp = render(
	<QueryClientProvider client={queryClient}>
		<App />
	</QueryClientProvider>,
);

await inkApp.waitUntilExit();
