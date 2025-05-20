/*

React Query Stuff

*/

import {QueryClient} from '@tanstack/react-query';
import {SearchOptions} from '../services/arxiv';
import path from 'path';
import os from 'os';

// Define PaperStatus here to avoid circular dependency
type PaperStatus = 'unread' | 'read';

export const queryClient = new QueryClient();

export const queryKeys = {
	all: ['allKeys'] as const,
	arxiv: {
		base: ['allKeys', 'arxiv'] as const,
		search: (query: string | null, options: SearchOptions) =>
			[...queryKeys.arxiv.base, 'search', query, options] as const,
		paper: (id: string | null) =>
			[...queryKeys.arxiv.base, 'paper', id] as const,
	},
	docling: {
		base: ['allKeys', 'docling'] as const,
		pdfParts: (pdfPath: string | null) =>
			[...queryKeys.docling.base, 'pdfParts', pdfPath] as const,
	},
	localPapers: {
		base: ['allKeys', 'localPapers'] as const,
		list: (status?: PaperStatus) =>
			[...queryKeys.localPapers.base, 'list', status] as const,
		detail: (id: string | null) =>
			[...queryKeys.localPapers.base, 'detail', id] as const,
	},
};

/*

Other

*/

// The base directory of the application
export const application_base_directory = path.join(
	os.homedir(),
	process.platform === 'win32' ? 'AppData/Local/arxiv-reader' : '.arxiv-reader',
);

export const docling_cache_directory = path.join(
	application_base_directory,
	'cache/docling',
);

export const local_papers_directory = path.join(
	application_base_directory,
	'localPapers',
);

export const read_paper_directory = path.join(
	application_base_directory,
	'readPapers',
);

export const unread_paper_directory = path.join(
	application_base_directory,
	'unreadPapers',
);
