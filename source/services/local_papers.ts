import fs from 'fs';
import path from 'path';
import {
	useQuery,
	useMutation,
	useQueryClient,
	UseQueryOptions,
	UseMutationOptions,
} from '@tanstack/react-query';
import type {Paper as ArxivPaper} from './arxiv.js';
import {ensureDirectories} from '../utils/ensureDirectories.js';
import {
	unread_paper_directory,
	read_paper_directory,
	queryKeys,
} from '../constants/index.js';

/*

Types

*/

export interface LocalPaperMetadata
	extends Omit<ArxivPaper, 'id' | 'published' | 'updated'> {
	// Local-specific metadata
	downloadedAt: number; // Timestamp (ms since epoch) of download
	fileSize: number; // File size in bytes
	starred: boolean; // User-defined flag
	archived: boolean; // User-defined flag
	tags: string[]; // User-defined tags

	// Dates from ArxivPaper, stored as ISO strings in JSON
	published: string;
	updated: string;
}

export interface LocalPaper extends ArxivPaper {
	// Local-specific fields, derived or directly from metadata
	filePath: string; // Absolute path on disk to the PDF
	downloadedAt: number;
	fileSize: number;
	starred: boolean;
	archived: boolean;
	tags: string[];
}

// Type for the structure of metadata.json
export type PapersMetadataFile = Record<string, LocalPaperMetadata>;

export type PaperStatus = 'unread' | 'read';

/*

Constants

*/

export const METADATA_FILENAME = 'metadata.json';

/* 

Helper Functions 

*/

/**
 * Reads and parses the metadata file for a specific status
 * @param status The status of papers (unread or read)
 * @returns A promise resolving to the metadata object
 */
async function readMetadataFile(
	status: PaperStatus,
): Promise<PapersMetadataFile> {
	const directory =
		status === 'unread' ? unread_paper_directory : read_paper_directory;
	const metadataPath = path.join(directory, METADATA_FILENAME);

	try {
		const rawData = await fs.promises.readFile(metadataPath, 'utf-8');
		return JSON.parse(rawData) as PapersMetadataFile;
	} catch (error) {
		// Return empty object if file doesn't exist or is invalid
		return {};
	}
}

/**
 * Writes metadata to the appropriate file
 * @param status The status of papers (unread or read)
 * @param data The metadata object to write
 * @returns A promise that resolves when the write is complete
 */
async function writeMetadataFile(
	status: PaperStatus,
	data: PapersMetadataFile,
): Promise<void> {
	const directory =
		status === 'unread' ? unread_paper_directory : read_paper_directory;
	const metadataPath = path.join(directory, METADATA_FILENAME);

	await fs.promises.writeFile(
		metadataPath,
		JSON.stringify(data, null, 2),
		'utf-8',
	);
}

/**
 * Gets the absolute file path for a paper's PDF
 * @param paperId The paper ID
 * @param status The status of the paper (unread or read)
 * @returns The absolute path to the PDF file
 */
function getPaperFilePath(paperId: string, status: PaperStatus): string {
	const directory =
		status === 'unread' ? unread_paper_directory : read_paper_directory;
	return path.join(directory, `${paperId}.pdf`);
}

/**
 * Converts metadata to a LocalPaper object
 * @param paperId The paper ID
 * @param metadata The paper metadata
 * @param status The status of the paper (unread or read)
 * @returns A LocalPaper object
 */
function convertMetadataToLocalPaper(
	paperId: string,
	metadata: LocalPaperMetadata,
	status: PaperStatus,
): LocalPaper {
	return {
		id: paperId,
		title: metadata.title,
		abstract: metadata.abstract,
		authors: metadata.authors,
		categories: metadata.categories,
		primaryCategory: metadata.primaryCategory,
		pdfUrl: metadata.pdfUrl,
		doi: metadata.doi,
		journalRef: metadata.journalRef,
		comment: metadata.comment,

		// Dates parsed back to Date objects
		published: new Date(metadata.published),
		updated: new Date(metadata.updated),

		// Local-specific fields
		filePath: getPaperFilePath(paperId, status),
		downloadedAt: metadata.downloadedAt,
		fileSize: metadata.fileSize,
		starred: metadata.starred,
		archived: metadata.archived,
		tags: metadata.tags,
	};
}

/**
 * Updates a paper's metadata using the provided update function
 * @param id The paper ID
 * @param updateFn A function that takes the existing metadata and returns updated metadata
 * @returns A promise that resolves when the update is complete
 */
async function updatePaperMetadata(
	id: string,
	updateFn: (meta: LocalPaperMetadata) => LocalPaperMetadata,
): Promise<void> {
	for (const status of ['unread', 'read'] as PaperStatus[]) {
		let metadataFile = await readMetadataFile(status);
		if (metadataFile[id]) {
			metadataFile[id] = updateFn(metadataFile[id]!);
			await writeMetadataFile(status, metadataFile);
			return;
		}
	}
	// Silently complete if paper ID not found (no-op)
}

/* 

Core Functions 

*/

/**
 * Initializes the local file storage system for papers
 * Creates necessary directories and ensures metadata files exist
 * @returns A promise that resolves when initialization is complete
 */
export async function initializeLocalFileStorage(): Promise<void> {
	ensureDirectories(); // Ensures base local_papers, read, unread dirs exist
	const unreadMetaPath = path.join(unread_paper_directory, METADATA_FILENAME);
	const readMetaPath = path.join(read_paper_directory, METADATA_FILENAME);

	// Ensure metadata files exist
	for (const metaPath of [unreadMetaPath, readMetaPath]) {
		try {
			// Check if file exists
			try {
				await fs.promises.access(metaPath);
			} catch {
				// File doesn't exist, create it with empty object
				await fs.promises.writeFile(metaPath, '{}', 'utf-8');
			}

			// Validate content
			const content = await fs.promises.readFile(metaPath, 'utf-8');
			if (content.trim() === '') {
				await fs.promises.writeFile(metaPath, '{}', 'utf-8');
			} else {
				// Validate JSON
				JSON.parse(content);
			}
		} catch (e) {
			// File might be invalid JSON, reset to empty object
			await fs.promises.writeFile(metaPath, '{}', 'utf-8');
		}
	}
}

/**
 * Lists local papers optionally filtered by status
 * @param status Optional status filter (unread or read)
 * @returns Promise resolving to an array of LocalPaper objects
 */
export async function listLocalPapers(
	status?: PaperStatus,
): Promise<LocalPaper[]> {
	const papers: LocalPaper[] = [];
	const statusesToScan = status
		? [status]
		: (['unread', 'read'] as PaperStatus[]);

	for (const currentStatus of statusesToScan) {
		const metadata = await readMetadataFile(currentStatus);
		for (const paperId in metadata) {
			if (Object.prototype.hasOwnProperty.call(metadata, paperId)) {
				papers.push(
					convertMetadataToLocalPaper(
						paperId,
						metadata[paperId]!,
						currentStatus,
					),
				);
			}
		}
	}
	return papers;
}

/**
 * Gets a specific local paper by its ID
 * @param id The paper ID
 * @returns Promise resolving to a LocalPaper object or undefined if not found
 */
export async function getLocalPaper(
	id: string,
): Promise<LocalPaper | undefined> {
	for (const status of ['unread', 'read'] as PaperStatus[]) {
		const metadata = await readMetadataFile(status);
		if (metadata[id]) {
			return convertMetadataToLocalPaper(id, metadata[id]!, status);
		}
	}
	return undefined;
}

/**
 * Marks a paper as read, moving it from unread to read storage
 * @param id The paper ID
 * @returns Promise that resolves when the operation is complete
 */
export async function markPaperAsRead(id: string): Promise<void> {
	let unreadMetadata = await readMetadataFile('unread');
	const paperMeta = unreadMetadata[id];
	if (!paperMeta) return; // Paper not in unread

	const oldPdfPath = getPaperFilePath(id, 'unread');
	const newPdfPath = getPaperFilePath(id, 'read');

	// Ensure the read directory exists
	await fs.promises.mkdir(path.dirname(newPdfPath), {recursive: true});

	try {
		// Move file (read file and write to new location, then delete old file)
		const fileData = await fs.promises.readFile(oldPdfPath);
		await fs.promises.writeFile(newPdfPath, fileData);
		await fs.promises.unlink(oldPdfPath);
	} catch (e: any) {
		if (e.code !== 'ENOENT') throw e; // Rethrow if not a "file not found" error
	}

	// Update metadata files
	delete unreadMetadata[id];
	await writeMetadataFile('unread', unreadMetadata);

	let readMetadata = await readMetadataFile('read');
	readMetadata[id] = paperMeta;
	await writeMetadataFile('read', readMetadata);
}

/**
 * Marks a paper as unread, moving it from read to unread storage
 * @param id The paper ID
 * @returns Promise that resolves when the operation is complete
 */
export async function markPaperAsUnread(id: string): Promise<void> {
	let readMetadata = await readMetadataFile('read');
	const paperMeta = readMetadata[id];
	if (!paperMeta) return; // Paper not in read

	const oldPdfPath = getPaperFilePath(id, 'read');
	const newPdfPath = getPaperFilePath(id, 'unread');

	// Ensure the unread directory exists
	await fs.promises.mkdir(path.dirname(newPdfPath), {recursive: true});

	try {
		// Move file (read file and write to new location, then delete old file)
		const fileData = await fs.promises.readFile(oldPdfPath);
		await fs.promises.writeFile(newPdfPath, fileData);
		await fs.promises.unlink(oldPdfPath);
	} catch (e: any) {
		if (e.code !== 'ENOENT') throw e; // Rethrow if not a "file not found" error
	}

	// Update metadata files
	delete readMetadata[id];
	await writeMetadataFile('read', readMetadata);

	let unreadMetadata = await readMetadataFile('unread');
	unreadMetadata[id] = paperMeta;
	await writeMetadataFile('unread', unreadMetadata);
}

/**
 * Deletes a paper and its metadata
 * @param id The paper ID
 * @returns Promise that resolves when the operation is complete
 */
export async function deleteLocalPaper(id: string): Promise<void> {
	for (const status of ['unread', 'read'] as PaperStatus[]) {
		let metadata = await readMetadataFile(status);
		if (metadata[id]) {
			const pdfPath = getPaperFilePath(id, status);
			try {
				await fs.promises.unlink(pdfPath);
			} catch (e: any) {
				if (e.code !== 'ENOENT') throw e; // Ignore if file already gone
			}
			delete metadata[id];
			await writeMetadataFile(status, metadata);
			return; // Found and processed
		}
	}
}

/**
 * Sets the starred status of a paper
 * @param payload Object containing paper ID and starred status
 * @returns Promise that resolves when the operation is complete
 */
export async function setPaperStarred({
	id,
	starred,
}: {
	id: string;
	starred: boolean;
}): Promise<void> {
	await updatePaperMetadata(id, meta => ({...meta, starred}));
}

/**
 * Sets the archived status of a paper
 * @param payload Object containing paper ID and archived status
 * @returns Promise that resolves when the operation is complete
 */
export async function setPaperArchived({
	id,
	archived,
}: {
	id: string;
	archived: boolean;
}): Promise<void> {
	await updatePaperMetadata(id, meta => ({...meta, archived}));
}

/**
 * Adds a tag to a paper
 * @param payload Object containing paper ID and tag to add
 * @returns Promise that resolves when the operation is complete
 */
export async function addPaperTag({
	id,
	tag,
}: {
	id: string;
	tag: string;
}): Promise<void> {
	await updatePaperMetadata(id, meta => {
		const newTags = new Set(meta.tags);
		newTags.add(tag);
		return {...meta, tags: Array.from(newTags)};
	});
}

/**
 * Removes a tag from a paper
 * @param payload Object containing paper ID and tag to remove
 * @returns Promise that resolves when the operation is complete
 */
export async function removePaperTag({
	id,
	tag,
}: {
	id: string;
	tag: string;
}): Promise<void> {
	await updatePaperMetadata(id, meta => {
		const newTags = meta.tags.filter(t => t !== tag);
		return {...meta, tags: newTags};
	});
}

/*

Initialization

*/

/**
 * Initialize the local papers system
 * This should be called when the application starts
 */
export async function initLocalPapersSystem(): Promise<void> {
	await initializeLocalFileStorage();
}

/*

Hooks

*/

/**
 * React Query hook to fetch local papers, optionally filtered by status
 * @param status Optional status filter (unread or read)
 * @param queryOptions Additional react-query options
 * @returns React Query result containing papers data, loading state, and error state
 */
export function useLocalPapers(
	status?: PaperStatus,
	queryOptions: Omit<
		UseQueryOptions<LocalPaper[], Error, LocalPaper[], any>,
		'queryKey' | 'queryFn'
	> = {},
) {
	return useQuery<LocalPaper[], Error, LocalPaper[], any>({
		queryKey: queryKeys.localPapers.list(status),
		queryFn: () => listLocalPapers(status),
		staleTime: 1000 * 60 * 5, // 5 minutes
		...queryOptions,
	});
}

/**
 * React Query hook to fetch a specific local paper by ID
 * @param id The paper ID
 * @param queryOptions Additional react-query options
 * @returns React Query result containing paper data, loading state, and error state
 */
export function useLocalPaper(
	id: string | null,
	queryOptions: Omit<
		UseQueryOptions<LocalPaper | undefined, Error, LocalPaper | undefined, any>,
		'queryKey' | 'queryFn'
	> = {},
) {
	return useQuery<LocalPaper | undefined, Error, LocalPaper | undefined, any>({
		queryKey: queryKeys.localPapers.detail(id),
		queryFn: () => (id ? getLocalPaper(id) : Promise.resolve(undefined)),
		enabled: !!id,
		staleTime: 1000 * 60 * 5, // 5 minutes
		...queryOptions,
	});
}

/**
 * React Query mutation hook to mark a paper as read
 * @param mutationOptions Additional react-query mutation options
 * @returns React Query mutation result
 */
export function useMarkPaperAsRead(
	mutationOptions: Omit<
		UseMutationOptions<void, Error, string, unknown>,
		'mutationFn'
	> = {},
) {
	const queryClient = useQueryClient();

	return useMutation<void, Error, string>({
		mutationFn: markPaperAsRead,
		onSuccess: () => {
			// Invalidate queries to refetch data
			queryClient.invalidateQueries({queryKey: queryKeys.localPapers.list()});
		},
		...mutationOptions,
	});
}

/**
 * React Query mutation hook to mark a paper as unread
 * @param mutationOptions Additional react-query mutation options
 * @returns React Query mutation result
 */
export function useMarkPaperAsUnread(
	mutationOptions: Omit<
		UseMutationOptions<void, Error, string, unknown>,
		'mutationFn'
	> = {},
) {
	const queryClient = useQueryClient();

	return useMutation<void, Error, string>({
		mutationFn: markPaperAsUnread,
		onSuccess: () => {
			// Invalidate queries to refetch data
			queryClient.invalidateQueries({queryKey: queryKeys.localPapers.list()});
		},
		...mutationOptions,
	});
}

/**
 * React Query mutation hook to delete a local paper
 * @param mutationOptions Additional react-query mutation options
 * @returns React Query mutation result
 */
export function useDeleteLocalPaper(
	mutationOptions: Omit<
		UseMutationOptions<void, Error, string, unknown>,
		'mutationFn'
	> = {},
) {
	const queryClient = useQueryClient();

	return useMutation<void, Error, string>({
		mutationFn: deleteLocalPaper,
		onSuccess: (_, paperId) => {
			// Invalidate queries to refetch data
			queryClient.invalidateQueries({queryKey: queryKeys.localPapers.list()});
			queryClient.invalidateQueries({
				queryKey: queryKeys.localPapers.detail(paperId),
			});
		},
		...mutationOptions,
	});
}

/**
 * React Query mutation hook to set a paper's starred status
 * @param mutationOptions Additional react-query mutation options
 * @returns React Query mutation result
 */
export function useSetPaperStarred(
	mutationOptions: Omit<
		UseMutationOptions<void, Error, {id: string; starred: boolean}, unknown>,
		'mutationFn'
	> = {},
) {
	const queryClient = useQueryClient();

	return useMutation<void, Error, {id: string; starred: boolean}>({
		mutationFn: setPaperStarred,
		onSuccess: (_, {id}) => {
			// Invalidate queries to refetch data
			queryClient.invalidateQueries({
				queryKey: queryKeys.localPapers.detail(id),
			});
			queryClient.invalidateQueries({queryKey: queryKeys.localPapers.list()});
		},
		...mutationOptions,
	});
}

/**
 * React Query mutation hook to set a paper's archived status
 * @param mutationOptions Additional react-query mutation options
 * @returns React Query mutation result
 */
export function useSetPaperArchived(
	mutationOptions: Omit<
		UseMutationOptions<void, Error, {id: string; archived: boolean}, unknown>,
		'mutationFn'
	> = {},
) {
	const queryClient = useQueryClient();

	return useMutation<void, Error, {id: string; archived: boolean}>({
		mutationFn: setPaperArchived,
		onSuccess: (_, {id}) => {
			// Invalidate queries to refetch data
			queryClient.invalidateQueries({
				queryKey: queryKeys.localPapers.detail(id),
			});
			queryClient.invalidateQueries({queryKey: queryKeys.localPapers.list()});
		},
		...mutationOptions,
	});
}

/**
 * React Query mutation hook to add a tag to a paper
 * @param mutationOptions Additional react-query mutation options
 * @returns React Query mutation result
 */
export function useAddPaperTag(
	mutationOptions: Omit<
		UseMutationOptions<void, Error, {id: string; tag: string}, unknown>,
		'mutationFn'
	> = {},
) {
	const queryClient = useQueryClient();

	return useMutation<void, Error, {id: string; tag: string}>({
		mutationFn: addPaperTag,
		onSuccess: (_, {id}) => {
			// Invalidate queries to refetch data
			queryClient.invalidateQueries({
				queryKey: queryKeys.localPapers.detail(id),
			});
			queryClient.invalidateQueries({queryKey: queryKeys.localPapers.list()});
		},
		...mutationOptions,
	});
}

/**
 * React Query mutation hook to remove a tag from a paper
 * @param mutationOptions Additional react-query mutation options
 * @returns React Query mutation result
 */
export function useRemovePaperTag(
	mutationOptions: Omit<
		UseMutationOptions<void, Error, {id: string; tag: string}, unknown>,
		'mutationFn'
	> = {},
) {
	const queryClient = useQueryClient();

	return useMutation<void, Error, {id: string; tag: string}>({
		mutationFn: removePaperTag,
		onSuccess: (_, {id}) => {
			// Invalidate queries to refetch data
			queryClient.invalidateQueries({
				queryKey: queryKeys.localPapers.detail(id),
			});
			queryClient.invalidateQueries({queryKey: queryKeys.localPapers.list()});
		},
		...mutationOptions,
	});
}
