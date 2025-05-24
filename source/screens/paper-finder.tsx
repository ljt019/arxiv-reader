/*
Planning:

The paper finder screen allows you to search for a paper using a query to arxiv.

The user should be able to use the arrow keys to navigate the list. Highlighting the currently
selected paper.

Some important things to note:

- The important information to show in the list is the title of the paper, the file size, and the date downloaded (downloadedAt).
The rest of the information should be shown in the extra paper info panel instead of the paper list.

- The user should be able to press 'd' and it should download the paper to the unread directory.

*/

import React, {useState, useEffect, useMemo, useCallback} from 'react';
import {Box, Text, useInput} from 'ink';
import {useNavigation} from '../router.js';
import useStdoutDimensions from '../hooks/useStdoutDimensions.js';
import {
	Card,
	CardHeader,
	CardTitle,
	CardContent,
} from '../components/ui/card.js';
import {TextInput} from '@inkjs/ui';
import {useArxivSearch, Paper} from '../services/arxiv.js';
import {useDownloadPaper, useLocalPapers} from '../services/local_papers.js';
import {formatDate, truncateToCharCount} from '../utils/format.js';
import debounce from 'lodash.debounce';

export default function PaperFinder() {
	const {navigate} = useNavigation();
	const [termWidth, termHeight] = useStdoutDimensions();
	const [query, setQuery] = useState('');
	const [debouncedQuery, setDebouncedQuery] = useState('');
	const [searchMode, setSearchMode] = useState(false);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
	const [recentlyDownloadedIds, setRecentlyDownloadedIds] = useState<
		Set<string>
	>(new Set());

	// Get all local papers to check which ones already exist
	const {data: localPapers = []} = useLocalPapers(undefined, {
		staleTime: 0,
		gcTime: 0,
	});

	// Create a Set of local paper IDs for fast lookup, including recently downloaded ones
	const localPaperIds = useMemo(() => {
		const existingIds = new Set(localPapers.map(paper => paper.id));
		// Merge with recently downloaded IDs for immediate feedback
		const allIds = new Set([...existingIds, ...recentlyDownloadedIds]);
		return allIds;
	}, [localPapers, recentlyDownloadedIds]);

	// Clean up recently downloaded IDs that are now in the actual local papers data
	useEffect(() => {
		const existingIds = new Set(localPapers.map(paper => paper.id));
		setRecentlyDownloadedIds(prev => {
			const newSet = new Set<string>();
			for (const id of prev) {
				if (!existingIds.has(id)) {
					newSet.add(id);
				}
			}
			return newSet;
		});
	}, [localPapers]);

	// Create debounced function
	const debouncedSetQuery = useCallback(
		debounce((newQuery: string) => {
			setDebouncedQuery(newQuery);
		}, 300),
		[],
	);

	// Update debounced query when query changes
	useEffect(() => {
		debouncedSetQuery(query);

		// Cleanup function to cancel pending debounced calls
		return () => {
			debouncedSetQuery.cancel();
		};
	}, [query, debouncedSetQuery]);

	// Search arxiv with the debounced query
	const {
		data: papers = [],
		isLoading,
		error,
	} = useArxivSearch(debouncedQuery.trim() || null, {maxResults: 20});

	// Download paper mutation
	const downloadMutation = useDownloadPaper({
		onSuccess: localPaper => {
			// Immediately update UI by adding to recently downloaded set
			setRecentlyDownloadedIds(prev => new Set([...prev, localPaper.id]));
			console.log(`Successfully downloaded paper: ${localPaper.id}`);
		},
		onError: error => {
			console.error('Failed to download paper:', error);
		},
	});

	// Update selected paper when index or papers change
	useEffect(() => {
		if (
			papers.length > 0 &&
			selectedIndex >= 0 &&
			selectedIndex < papers.length
		) {
			setSelectedPaper(papers[selectedIndex] || null);
		} else {
			setSelectedPaper(null);
		}
	}, [selectedIndex, papers]);

	// Reset selection when query changes
	useEffect(() => {
		setSelectedIndex(0);
	}, [debouncedQuery]);

	// Check if selected paper already exists locally
	const selectedPaperExists = selectedPaper
		? localPaperIds.has(selectedPaper.id)
		: false;

	// Handle keyboard input
	useInput((input, key) => {
		// Handle search mode toggle
		if (input === 's' && !searchMode) {
			setSearchMode(true);
			return;
		}

		// Handle search mode exit keys
		if (
			searchMode &&
			(key.upArrow ||
				key.downArrow ||
				key.leftArrow ||
				key.rightArrow ||
				key.escape)
		) {
			setSearchMode(false);
			// Don't return early - let these keys perform their normal actions
		}

		// Normal navigation (only when not in search mode)
		if (!searchMode) {
			if (key.escape) {
				navigate('library');
			} else if (key.upArrow) {
				setSelectedIndex(i => Math.max(0, i - 1));
			} else if (key.downArrow) {
				setSelectedIndex(i => Math.min((papers?.length ?? 0) - 1, i + 1));
			} else if (input === 'd') {
				if (selectedPaper && !selectedPaperExists) {
					downloadMutation.mutate(selectedPaper);
				}
			}
		}
	});

	return (
		<Box flexDirection="row" width={termWidth} height={termHeight}>
			<Box flexDirection="column" height="100%" width="70%">
				<Box height="90%" width="100%">
					<PapersList
						papers={papers}
						selectedIndex={selectedIndex}
						isLoading={isLoading}
						error={error}
						localPaperIds={localPaperIds}
					/>
				</Box>
				<Box height="10%" width="100%">
					<QueryBar
						query={query}
						onQueryChange={setQuery}
						searchMode={searchMode}
					/>
				</Box>
			</Box>
			<Box height="100%" width="30%">
				<ExtraPaperInfo
					selectedPaper={selectedPaper}
					paperExists={selectedPaperExists}
				/>
			</Box>
		</Box>
	);
}

interface PapersListProps {
	papers: Paper[];
	selectedIndex: number;
	isLoading: boolean;
	error: Error | null;
	localPaperIds: Set<string>;
}

function PapersList({
	papers,
	selectedIndex,
	isLoading,
	error,
	localPaperIds,
}: PapersListProps) {
	return (
		<Box height="100%" width="100%">
			<Card height="100%" width="100%">
				<CardContent>
					<PapersListContent
						papers={papers}
						selectedIndex={selectedIndex}
						isLoading={isLoading}
						error={error}
						localPaperIds={localPaperIds}
					/>
				</CardContent>
			</Card>
		</Box>
	);
}

function PapersListContent({
	papers,
	selectedIndex,
	isLoading,
	error,
	localPaperIds,
}: PapersListProps) {
	const [termWidth] = useStdoutDimensions();

	// Memoize the Table to prevent unnecessary re-renders
	const tableContent = useMemo(() => {
		if (isLoading) {
			return (
				<CustomPaperTable
					papers={[]}
					selectedIndex={-1}
					localPaperIds={localPaperIds}
					showLoadingMessage={true}
				/>
			);
		}
		if (error)
			return <Text color="red">Error searching papers: {error.message}</Text>;
		if (papers.length === 0)
			return <Text>No papers found. Try a different search query.</Text>;

		return (
			<CustomPaperTable
				papers={papers}
				selectedIndex={selectedIndex}
				localPaperIds={localPaperIds}
			/>
		);
	}, [papers, selectedIndex, isLoading, error, termWidth, localPaperIds]);

	return <Box height="100%">{tableContent}</Box>;
}

// Custom table component that can highlight existing papers
interface CustomPaperTableProps {
	papers: Paper[];
	selectedIndex: number;
	localPaperIds: Set<string>;
	showLoadingMessage?: boolean;
}

function CustomPaperTable({
	papers,
	selectedIndex,
	localPaperIds,
	showLoadingMessage = false,
}: CustomPaperTableProps) {
	const [termWidth] = useStdoutDimensions();

	// Calculate column widths (similar to the original table)
	const titleWidth = Math.floor(termWidth * 0.5);
	const categoryWidth = 16;
	const dateWidth = 18;

	return (
		<Box flexDirection="column" width={termWidth}>
			{/* Header row */}
			<Box flexDirection="row">
				<Box width={titleWidth} marginRight={2}>
					<Text bold>Title</Text>
				</Box>
				<Box width={categoryWidth} marginRight={2}>
					<Text bold>Category</Text>
				</Box>
				<Box width={dateWidth}>
					<Text bold>Published</Text>
				</Box>
			</Box>

			{/* Header divider */}
			<Box
				borderStyle="single"
				borderBottom
				borderLeft={false}
				borderRight={false}
				borderTop={false}
				borderColor="gray"
				marginBottom={1}
			/>

			{/* Content area */}
			{showLoadingMessage ? (
				<Box justifyContent="center" marginTop={2}>
					<Text>Searching ArXiv...</Text>
				</Box>
			) : (
				papers.map((paper, index) => {
					const isSelected = index === selectedIndex;
					const paperExists = localPaperIds.has(paper.id);
					const textColor = paperExists ? 'blue' : 'white';
					const isBold = isSelected;

					const isDim = !isSelected;

					return (
						<Box key={`row-${index}`} flexDirection="row">
							<Box width={titleWidth} marginRight={2}>
								<Text
									wrap="truncate"
									color={textColor}
									bold={isBold}
									dimColor={isDim}
								>
									{String(paper.title || '')}
								</Text>
							</Box>
							<Box width={categoryWidth} marginRight={2}>
								<Text
									wrap="truncate"
									color={textColor}
									bold={isBold}
									dimColor={isDim}
								>
									{String(paper.primaryCategory || '')}
								</Text>
							</Box>
							<Box width={dateWidth}>
								<Text
									wrap="truncate"
									color={textColor}
									bold={isBold}
									dimColor={isDim}
								>
									{formatDate(paper.published.getTime())}
								</Text>
							</Box>
						</Box>
					);
				})
			)}
		</Box>
	);
}

interface ExtraPaperInfoProps {
	selectedPaper: Paper | null;
	paperExists: boolean;
}

function ExtraPaperInfo({selectedPaper, paperExists}: ExtraPaperInfoProps) {
	return (
		<Box height="100%" width="100%">
			<Card height="100%" width="100%">
				<CardHeader>
					<CardTitle>
						<Box width="100%" justifyContent="center">
							<Text bold>Selected Paper</Text>
						</Box>
					</CardTitle>
				</CardHeader>
				<Box
					borderStyle="single"
					borderBottom
					borderLeft={false}
					borderRight={false}
					borderTop={false}
					borderColor="gray"
					marginBottom={1}
				/>
				<CardContent>
					<ExtraPaperInfoContent
						selectedPaper={selectedPaper}
						paperExists={paperExists}
					/>
				</CardContent>
			</Card>
		</Box>
	);
}

function ExtraPaperInfoContent({
	selectedPaper,
	paperExists,
}: ExtraPaperInfoProps) {
	if (!selectedPaper) {
		return <Text>No paper selected</Text>;
	}

	// Helper function to safely convert values to strings
	const safeString = (value: any): string => {
		if (typeof value === 'string') return value;
		if (typeof value === 'object' && value !== null) {
			// Handle XML parsing artifacts
			if (value['#text']) return String(value['#text']);
			return String(value);
		}
		return String(value || '');
	};

	// Safely convert arrays to string arrays
	const safeStringArray = (arr: any[]): string[] => {
		return arr.map(item => safeString(item));
	};

	return (
		<Box flexDirection="column" height="100%">
			{/* Authors with fixed height */}
			<Box height={2}>
				<Text wrap="truncate">
					Authors: {safeStringArray(selectedPaper.authors).join(', ')}
				</Text>
			</Box>

			{/* Date with fixed height */}
			<Box height={1}>
				<Text>Published: {selectedPaper.published.toLocaleDateString()}</Text>
			</Box>

			{/* Categories with fixed height */}
			<Box height={1}>
				<Text wrap="truncate">
					Categories: {safeStringArray(selectedPaper.categories).join(', ')}
				</Text>
			</Box>

			{/* DOI if available */}
			{selectedPaper.doi && (
				<Box height={1}>
					<Text wrap="truncate">DOI: {safeString(selectedPaper.doi)}</Text>
				</Box>
			)}

			{/* Abstract with flex grow to fill remaining space */}
			<Box flexGrow={1} marginTop={1} overflow="hidden">
				<Text wrap="wrap">
					Abstract:{' '}
					{truncateToCharCount(safeString(selectedPaper.abstract), 800)}
				</Text>
			</Box>

			{/* Instructions */}
			<Box height={1} marginTop={1}>
				<Text color={paperExists ? 'blue' : 'gray'}>
					{paperExists
						? 'Already exists locally'
						: "Press 'd' to download • ESC to go back"}
				</Text>
			</Box>
		</Box>
	);
}

interface QueryBarProps {
	query: string;
	onQueryChange: (query: string) => void;
	searchMode: boolean;
}

function QueryBar({query, onQueryChange, searchMode}: QueryBarProps) {
	return (
		<Box height="100%" width="100%">
			<Card
				height="100%"
				width="100%"
				borderStyle={'round'}
				borderColor={searchMode ? 'blue' : undefined}
			>
				<CardContent>
					<QueryBarContent
						query={query}
						onQueryChange={onQueryChange}
						searchMode={searchMode}
					/>
				</CardContent>
			</Card>
		</Box>
	);
}

function QueryBarContent({query, onQueryChange, searchMode}: QueryBarProps) {
	const placeholder = searchMode
		? 'Type your query... (ESC or arrows to exit)'
		: "Press 's' to search ArXiv...";

	return (
		<Box alignSelf="flex-start" width="100%">
			<TextInput
				placeholder={placeholder}
				defaultValue={query}
				onChange={onQueryChange}
				isDisabled={!searchMode}
			/>
		</Box>
	);
}
