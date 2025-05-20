/*

The purpose of this interface is to simplify the usage of the Docling cli,
in my application code.

*/

import {exec as execCb} from 'child_process';
import path from 'path';
import fs from 'fs';
import {promisify} from 'util';
import {useQuery, UseQueryOptions} from '@tanstack/react-query';
import {tryCatch} from '../types/try-catch.js';
import {
	extractPartsFromResult,
	ExtractedPart,
} from '../utils/extractPartsFromResult.js';

/*

Types

*/

interface CacheEntry {
	pdfPath: string;
	outputPath: string;
	timestamp: number;
}

// Constants
const CACHE_DIR = path.resolve(process.cwd(), '.docling_cache');
const CACHE_METADATA_FILE = path.join(CACHE_DIR, 'cache_metadata.json');
const MAX_CACHE_SIZE = 5;
const exec = promisify(execCb);

/* 

Functions 

*/

/**
 * Initialize the docling cache
 * @returns Array of cache entries loaded from disk
 */
function initializeCache(): CacheEntry[] {
	// Initialize the cache directory if it doesn't exist
	if (!fs.existsSync(CACHE_DIR)) {
		fs.mkdirSync(CACHE_DIR, {recursive: true});
	}

	// Load cache from disk or initialize an empty one
	let cache: CacheEntry[] = [];
	try {
		if (fs.existsSync(CACHE_METADATA_FILE)) {
			const cacheData = fs.readFileSync(CACHE_METADATA_FILE, 'utf8');
			cache = JSON.parse(cacheData);

			// Validate cache entries - remove any that no longer exist on disk
			cache = cache.filter(entry => fs.existsSync(entry.outputPath));

			// Update the cache file after validation
			saveCache(cache);
		}
	} catch (error) {
		// If we can't load the cache, start with an empty one
		console.error('Error loading cache metadata:', error);
		cache = [];
	}

	return cache;
}

/**
 * Save cache to disk
 * @param cache Array of cache entries to save
 */
function saveCache(cache: CacheEntry[]): void {
	try {
		fs.writeFileSync(CACHE_METADATA_FILE, JSON.stringify(cache, null, 2));
	} catch (error) {
		console.error('Error saving cache metadata:', error);
	}
}

/**
 * Convert PDF to Markdown using the docling CLI
 * @param pdfPath Path to the PDF file
 * @returns Promise resolving to markdown content
 */
async function pdfToMarkdown(pdfPath: string): Promise<string> {
	// Initialize cache if not already done
	let pdfCache = initializeCache();

	// Normalize the path for cache key consistency
	const normalizedPath = path.normalize(pdfPath);

	// Check if the PDF is in the cache
	const cacheIndex = pdfCache.findIndex(
		entry => path.normalize(entry.pdfPath) === normalizedPath,
	);

	if (cacheIndex !== -1) {
		// We found this PDF in the cache
		const cachedEntry = pdfCache[cacheIndex]!;

		// Check if the cached file still exists
		if (fs.existsSync(cachedEntry.outputPath)) {
			// Move this entry to the front of the cache (most recently used)
			pdfCache.splice(cacheIndex, 1);
			cachedEntry.timestamp = Date.now();
			pdfCache.unshift(cachedEntry);

			// Save the updated cache to disk
			saveCache(pdfCache);

			// Read from the cached file
			let markdownPath = cachedEntry.outputPath;
			const stat = fs.statSync(markdownPath);
			if (stat.isDirectory()) {
				const files = fs.readdirSync(markdownPath);
				const mdFile = files.find(f => f.endsWith('.md'));
				if (!mdFile) {
					throw new Error(
						`No markdown file found in directory ${markdownPath}`,
					);
				}
				markdownPath = path.join(markdownPath, mdFile);
			}
			return fs.readFileSync(markdownPath, 'utf8');
		}

		// If the file doesn't exist anymore, remove it from the cache
		pdfCache.splice(cacheIndex, 1);
		saveCache(pdfCache);
	}

	// Generate a hash/safename for the PDF to use in the output path
	const safeName = path
		.basename(normalizedPath)
		.replace(/[^a-zA-Z0-9.-]/g, '_');
	const uniqueId =
		Date.now().toString() + Math.random().toString(36).substring(2, 7);
	const outputName = `docling-${safeName}-${uniqueId}`;

	// Store output in the persistent cache directory
	const tempFilePath = path.join(CACHE_DIR, outputName + '.md');
	const command = `docling "${normalizedPath}" --to md --output "${tempFilePath}"`;

	const result = await tryCatch(
		(async () => {
			await exec(command);
			// If output is a directory (e.g. with assets), find the .md inside
			let markdownPath = tempFilePath;
			const stat = fs.statSync(tempFilePath);
			if (stat.isDirectory()) {
				const files = fs.readdirSync(tempFilePath);
				const mdFile = files.find(f => f.endsWith('.md'));
				if (!mdFile) {
					throw new Error(
						`No markdown file found in directory ${tempFilePath}`,
					);
				}
				markdownPath = path.join(tempFilePath, mdFile);
			}
			const data = fs.readFileSync(markdownPath, 'utf8');
			return data;
		})(),
	);

	if (result.error) {
		// If processing failed, clean up any partial output
		if (fs.existsSync(tempFilePath)) {
			try {
				fs.rmSync(tempFilePath, {recursive: true, force: true});
			} catch (cleanupError) {
				// Ignore cleanup errors
			}
		}
		throw result.error;
	}

	// Add this successful conversion to the cache
	pdfCache.unshift({
		pdfPath: normalizedPath,
		outputPath: tempFilePath,
		timestamp: Date.now(),
	});

	// If cache exceeds maximum size, remove the least recently used entry and delete its file
	if (pdfCache.length > MAX_CACHE_SIZE) {
		const evictedEntry = pdfCache.pop();
		if (evictedEntry && fs.existsSync(evictedEntry.outputPath)) {
			try {
				fs.rmSync(evictedEntry.outputPath, {recursive: true, force: true});
			} catch (cleanupError) {
				// Ignore cleanup errors
			}
		}
	}

	// Save the updated cache to disk
	saveCache(pdfCache);

	// Return the processed markdown
	return result.data!;
}

/*

Hooks

*/

/**
 * React Query hook to convert a PDF to parsed Markdown parts
 * @param pdfPath Path to the PDF file
 * @param queryOptions Additional react-query options
 * @returns React Query result object containing extracted parts, loading state, and error state
 */
function useDoclingPdfParts(
	pdfPath: string | null,
	queryOptions: Omit<
		UseQueryOptions<
			ExtractedPart[],
			Error,
			ExtractedPart[],
			[string, string | null]
		>,
		'queryKey' | 'queryFn'
	> = {},
) {
	return useQuery<
		ExtractedPart[],
		Error,
		ExtractedPart[],
		[string, string | null]
	>({
		queryKey: ['doclingPdfParts', pdfPath],
		queryFn: async () => {
			if (!pdfPath) {
				throw new Error('No PDF path provided');
			}
			const markdownString = await pdfToMarkdown(pdfPath);
			if (typeof markdownString !== 'string') {
				throw new Error('pdfToMarkdown did not return a string.');
			}
			return extractPartsFromResult(markdownString);
		},
		enabled: !!pdfPath,
		staleTime: 1000 * 60 * 60 * 24, // 24 hours
		...queryOptions,
	});
}

export {
	// Types
	CacheEntry,
	ExtractedPart,

	// Functions
	pdfToMarkdown,

	// Hooks
	useDoclingPdfParts,
};
