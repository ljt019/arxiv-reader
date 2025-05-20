import axios from 'axios';
import {XMLParser} from 'fast-xml-parser';
import {useQuery, UseQueryOptions} from '@tanstack/react-query';

/*

Types

*/

interface Paper {
	id: string;
	title: string;
	abstract: string;
	authors: string[];
	published: Date;
	updated: Date;
	categories: string[];
	primaryCategory: string;
	pdfUrl: string;
	doi?: string;
	journalRef?: string;
	comment?: string;
}

interface SearchOptions {
	start?: number;
	maxResults?: number;
	sortBy?: 'relevance' | 'lastUpdatedDate' | 'submittedDate';
	sortOrder?: 'ascending' | 'descending';
}

// Interfaces for parsed XML data
interface ArxivAuthor {
	name: string;
	'arxiv:affiliation'?: string;
}

interface ArxivCategory {
	_term: string;
	_scheme: string;
}

interface ArxivLink {
	_href: string;
	_rel: string;
	_type?: string;
	_title?: string;
}

interface ArxivEntry {
	id: string;
	published: string;
	updated: string;
	title: string;
	summary: string;
	author: ArxivAuthor | ArxivAuthor[];
	category?: ArxivCategory | ArxivCategory[];
	'arxiv:primary_category'?: ArxivCategory;
	'arxiv:comment'?: string;
	'arxiv:journal_ref'?: string;
	'arxiv:doi'?: string;
	link: ArxivLink | ArxivLink[];
}

interface ArxivResponse {
	feed: {
		entry?: ArxivEntry | ArxivEntry[];
	};
}

/* 

Functions 

*/

/**
 * Search arXiv for papers matching the given query
 * @param query Search query string
 * @param options Search options including pagination and sorting
 * @returns Promise resolving to an array of Paper objects
 */
async function searchArxiv(
	query: string,
	options: SearchOptions = {},
): Promise<Paper[]> {
	// Set default options
	const start = options.start ?? 0;
	const maxResults = options.maxResults ?? 10;
	const sortBy = options.sortBy ?? 'relevance';
	const sortOrder = options.sortOrder ?? 'descending';

	// Build URL with query parameters
	const params = new URLSearchParams({
		search_query: `all:${query}`,
		start: start.toString(),
		max_results: maxResults.toString(),
		sortBy,
		sortOrder,
	});

	const url = `https://export.arxiv.org/api/query?${params.toString()}`;

	try {
		const response = await axios.get(url);
		const papers = parseArxivResponse(response.data);
		return papers;
	} catch (error) {
		console.error('Error searching arXiv:', error);
		throw error;
	}
}

/**
 * Get a specific paper by its arXiv ID
 * @param id arXiv paper ID
 * @returns Promise resolving to a Paper object
 * @throws Error if paper is not found
 */
async function getPaperById(id: string): Promise<Paper> {
	const params = new URLSearchParams({
		id_list: id,
	});

	const url = `https://export.arxiv.org/api/query?${params.toString()}`;

	try {
		const response = await axios.get(url);
		const papers = parseArxivResponse(response.data);

		if (papers.length === 0) {
			throw new Error(`Paper with ID ${id} not found`);
		}

		// We know papers[0] exists because we checked the length above
		return papers[0]!;
	} catch (error) {
		console.error(`Error fetching paper with ID ${id}:`, error);
		throw error;
	}
}

/**
 * Parse the Atom XML response from arXiv API into Paper objects
 * @param xmlData XML string from arXiv API
 * @returns Array of Paper objects
 */
function parseArxivResponse(xmlData: string): Paper[] {
	const parser = new XMLParser({
		ignoreAttributes: false,
		attributeNamePrefix: '_',
		isArray: name =>
			name === 'entry' || name === 'author' || name === 'category',
	});

	const result = parser.parse(xmlData) as ArxivResponse;

	// Handle case where no results were found
	if (!result.feed?.entry) {
		return [];
	}

	// Handle single entry (not in an array)
	const entries = Array.isArray(result.feed.entry)
		? result.feed.entry
		: [result.feed.entry];

	return entries.map((entry: ArxivEntry) => {
		// Extract author names
		const authors = Array.isArray(entry.author)
			? entry.author.map(author => author.name)
			: entry.author
			? [entry.author.name]
			: [];

		// Extract categories
		const categories = Array.isArray(entry.category)
			? entry.category.map(cat => cat._term)
			: entry.category
			? [entry.category._term]
			: [];

		// Find primary category
		const primaryCategory =
			entry['arxiv:primary_category']?._term || categories[0] || '';

		// Find PDF link (prefer type over title for reliability)
		const links = Array.isArray(entry.link)
			? entry.link
			: entry.link
			? [entry.link]
			: [];
		const pdfLink =
			links.find(link => link._type === 'application/pdf') ||
			links.find(link => link._title === 'pdf');
		const pdfUrl = pdfLink ? pdfLink._href : '';

		// Extract DOI if present
		const doi = entry['arxiv:doi'];

		return {
			id: entry.id.replace('http://arxiv.org/abs/', ''),
			title: entry.title.trim(),
			abstract: entry.summary.trim(),
			authors,
			published: new Date(entry.published),
			updated: new Date(entry.updated),
			categories,
			primaryCategory,
			pdfUrl,
			doi: doi || undefined,
			journalRef: entry['arxiv:journal_ref'] || undefined,
			comment: entry['arxiv:comment'] || undefined,
		};
	});
}

/*

Hooks

*/

/**
 * React Query hook to search arXiv for papers matching a query
 * @param query Search query string
 * @param options Search options including pagination and sorting
 * @param queryOptions Additional react-query options
 * @returns React Query result object containing papers data, loading state, and error state
 */
function useArxivSearch(
	query: string | null,
	options: SearchOptions = {},
	queryOptions: Omit<
		UseQueryOptions<
			Paper[],
			Error,
			Paper[],
			[string, string | null, SearchOptions]
		>,
		'queryKey' | 'queryFn'
	> = {},
) {
	return useQuery<
		Paper[],
		Error,
		Paper[],
		[string, string | null, SearchOptions]
	>({
		queryKey: ['arxivSearch', query, options],
		queryFn: () =>
			query ? searchArxiv(query, options) : Promise.resolve([] as Paper[]),
		enabled: !!query,
		staleTime: 1000 * 60 * 60, // 1 hour
		...queryOptions,
	});
}

/**
 * React Query hook to fetch a specific paper by its arXiv ID
 * @param id arXiv paper ID
 * @param queryOptions Additional react-query options
 * @returns React Query result object containing paper data, loading state, and error state
 */
function useArxivPaper(
	id: string | null,
	queryOptions: Omit<
		UseQueryOptions<Paper, Error, Paper, [string, string | null]>,
		'queryKey' | 'queryFn'
	> = {},
) {
	return useQuery<Paper, Error, Paper, [string, string | null]>({
		queryKey: ['arxivPaper', id],
		queryFn: () =>
			id ? getPaperById(id) : Promise.reject(new Error('No ID provided')),
		enabled: !!id,
		staleTime: 1000 * 60 * 60 * 24, // 24 hours
		...queryOptions,
	});
}

export {
	// Types
	Paper,
	SearchOptions,

	// Hooks
	useArxivSearch,
	useArxivPaper,
};
