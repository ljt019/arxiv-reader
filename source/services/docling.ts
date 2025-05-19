/*

The purpose of this interface is to simplify the usage of the Docling cli,
in my application code.

*/

import {exec as execCb} from 'child_process';
import path from 'path';
import fs from 'fs';
import {tryCatch} from '../types/try-catch.js';
import {promisify} from 'util';
const exec = promisify(execCb);

// Simple LRU cache to keep track of the last 5 processed PDFs
type CacheEntry = {
	pdfPath: string;
	outputPath: string;
	timestamp: number;
};

// Path to persistent cache directory and metadata file
const CACHE_DIR = path.resolve(process.cwd(), '.docling_cache');
const CACHE_METADATA_FILE = path.join(CACHE_DIR, 'cache_metadata.json');
const MAX_CACHE_SIZE = 5;

// Initialize the cache directory if it doesn't exist
if (!fs.existsSync(CACHE_DIR)) {
	fs.mkdirSync(CACHE_DIR, {recursive: true});
}

// Load cache from disk or initialize an empty one
let PDF_CACHE: CacheEntry[] = [];
try {
	if (fs.existsSync(CACHE_METADATA_FILE)) {
		const cacheData = fs.readFileSync(CACHE_METADATA_FILE, 'utf8');
		PDF_CACHE = JSON.parse(cacheData);

		// Validate cache entries - remove any that no longer exist on disk
		PDF_CACHE = PDF_CACHE.filter(entry => fs.existsSync(entry.outputPath));

		// Update the cache file after validation
		fs.writeFileSync(CACHE_METADATA_FILE, JSON.stringify(PDF_CACHE, null, 2));
	}
} catch (error) {
	// If we can't load the cache, start with an empty one
	PDF_CACHE = [];
}

// Function to save cache to disk
function saveCache() {
	try {
		fs.writeFileSync(CACHE_METADATA_FILE, JSON.stringify(PDF_CACHE, null, 2));
	} catch (error) {
		console.error('Error saving cache metadata:', error);
	}
}

export async function pdf_to_markdown(pdf_path: string) {
	/*
      You call the docling cli with a command like this `docling {pdf_path} --to md --output {output_path}`

      The only issue with the docling cli is the only way to output the result is to save it to a file.
      The cli doesn't support stdout.

      We implement a persistent cache in the .docling_cache folder to keep the last 5 processed PDFs 
      and their output paths. This way we don't have to process the same document repeatedly,
      even between application restarts.
  */

	// Normalize the path for cache key consistency
	const normalizedPath = path.normalize(pdf_path);

	// Check if the PDF is in the cache
	const cacheIndex = PDF_CACHE.findIndex(
		entry => path.normalize(entry.pdfPath) === normalizedPath,
	);
	if (cacheIndex !== -1) {
		// We know this entry exists because we found a valid index
		const cachedEntry = PDF_CACHE[cacheIndex]!;

		// Check if the cached file still exists
		if (fs.existsSync(cachedEntry.outputPath)) {
			// Move this entry to the front of the cache (most recently used)
			PDF_CACHE.splice(cacheIndex, 1);
			cachedEntry.timestamp = Date.now();
			PDF_CACHE.unshift(cachedEntry);

			// Save the updated cache to disk
			saveCache();

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
		PDF_CACHE.splice(cacheIndex, 1);
		saveCache();
	}

	// Generate a hash/safename for the PDF to use in the output path
	const safeName = path
		.basename(normalizedPath)
		.replace(/[^a-zA-Z0-9.-]/g, '_');
	const uniqueId =
		Date.now().toString() + Math.random().toString(36).substring(2, 7);
	const outputName = `docling-${safeName}-${uniqueId}`;

	// Store output in the persistent cache directory
	const temp_file_path = path.join(CACHE_DIR, outputName + '.md');
	const command = `docling "${normalizedPath}" --to md --output "${temp_file_path}"`;

	const result = await tryCatch(
		(async () => {
			await exec(command);
			// If output is a directory (e.g. with assets), find the .md inside
			let markdownPath = temp_file_path;
			const stat = fs.statSync(temp_file_path);
			if (stat.isDirectory()) {
				const files = fs.readdirSync(temp_file_path);
				const mdFile = files.find(f => f.endsWith('.md'));
				if (!mdFile) {
					throw new Error(
						`No markdown file found in directory ${temp_file_path}`,
					);
				}
				markdownPath = path.join(temp_file_path, mdFile);
			}
			const data = fs.readFileSync(markdownPath, 'utf8');
			return data;
		})(),
	);

	if (result.error) {
		// If processing failed, clean up any partial output
		if (fs.existsSync(temp_file_path)) {
			try {
				fs.rmSync(temp_file_path, {recursive: true, force: true});
			} catch (cleanupError) {
				// Ignore cleanup errors
			}
		}
		throw result.error;
	}

	// Add this successful conversion to the cache
	PDF_CACHE.unshift({
		pdfPath: normalizedPath,
		outputPath: temp_file_path,
		timestamp: Date.now(),
	});

	// If cache exceeds maximum size, remove the least recently used entry and delete its file
	if (PDF_CACHE.length > MAX_CACHE_SIZE) {
		const evictedEntry = PDF_CACHE.pop();
		if (evictedEntry && fs.existsSync(evictedEntry.outputPath)) {
			try {
				fs.rmSync(evictedEntry.outputPath, {recursive: true, force: true});
			} catch (cleanupError) {
				// Ignore cleanup errors
			}
		}
	}

	// Save the updated cache to disk
	saveCache();

	// Return the processed markdown
	return result.data!;
}

/*

Hook to use the pdf_to_markdown function, with react-query

*/

import {useQuery} from '@tanstack/react-query';
import {
	extractPartsFromResult,
	ExtractedPart,
} from '../utils/extractPartsFromResult.js'; // Import necessary types/functions

function usePdfToMarkdown(pdf_path: string) {
	// The hook now returns ExtractedPart[] or Error
	return useQuery<ExtractedPart[], Error>({
		queryKey: ['pdf-parts', pdf_path], // Changed queryKey to reflect the new data type
		queryFn: async () => {
			const markdownString = await pdf_to_markdown(pdf_path);
			// Ensure markdownString is a string before processing.
			// pdf_to_markdown should throw if it's not, but an extra check is safe.
			if (typeof markdownString !== 'string') {
				throw new Error('pdf_to_markdown did not return a string.');
			}
			const parts = extractPartsFromResult(markdownString);
			return parts;
		},
	});
}

export default usePdfToMarkdown;
