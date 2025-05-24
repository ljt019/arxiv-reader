/*
Planning:

The library screen is a list of all the papers in both the read and unread directories.

The user should be able to use the arrow keys to navigate the list. Highlighting the currently
selected paper.

For now we aren't going to worry about the user being able to open the papers.
Just the ability to see the list and navigate it.

Some important things to note:

- You shouldn't show the name of the file to the user. The name of the file is 
the id of the paper. You need to use that id to get the paper metadata from the 'metadata.json' file.
- The important information to show in the list is the title of the paper, the file size, and the date downloaded (downloadedAt).

*/

import React, {useState, useEffect, useMemo} from 'react';
import {Box, Text, useInput} from 'ink';
import useStdoutDimensions from '../hooks/useStdoutDimensions.js';

import {Badge} from '@inkjs/ui';

import {
	Card,
	CardHeader,
	CardTitle,
	CardContent,
} from '../components/ui/card.js';
import Table, {Column} from '../components/ui/table.js';
import {useLocalPapers, LocalPaper} from '../services/local_papers.js';
import {
	formatFileSize,
	formatDate,
	truncateToCharCount,
} from '../utils/format.js';
import {
	SelectedPaperProvider,
	useSelectedPaper,
} from '../contexts/SelectedPaperContext.js';

import {useNavigation} from '../router.js';

export default function Library() {
	// Get terminal dimensions
	const [termWidth, termHeight] = useStdoutDimensions();
	const {navigate} = useNavigation();

	// @ts-ignore
	useInput((input, key) => {
		if (input === 'f') {
			navigate('paper-finder');
		} else if (input === 'r') {
			navigate('reader');
		}
	});

	return (
		<SelectedPaperProvider>
			<Box flexDirection="row" width={termWidth} height={termHeight}>
				<Box width="70%" height="100%">
					<PaperListPanel />
				</Box>
				<Box width="30%" height="100%" flexDirection="column">
					<Box height="30%">
						<GeneralStatsPanel />
					</Box>
					<Box height="70%">
						<SelectedPaperInfoPanel />
					</Box>
				</Box>
			</Box>
		</SelectedPaperProvider>
	);
}

function GeneralStatsPanel() {
	const {data: allPapers} = useLocalPapers();
	const {data: readPapers} = useLocalPapers('read');
	const {data: unreadPapers} = useLocalPapers('unread');

	return (
		<Box height="100%" width="100%">
			<Card height="100%" width="100%">
				<CardHeader>
					<CardTitle>
						<Box width="100%" justifyContent="center">
							<Text bold>General Stats</Text>
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
					<GeneralStatsContent
						totalPapers={allPapers?.length ?? 0}
						readPapers={readPapers?.length ?? 0}
						unreadPapers={unreadPapers?.length ?? 0}
						totalSize={
							allPapers?.reduce((acc, paper) => acc + paper.fileSize, 0) ?? 0
						}
					/>
				</CardContent>
			</Card>
		</Box>
	);
}

/*
Shows some general stats about the library.
- Total papers (both read and unread)
- Total read papers 
- Total unread papers
- Total size of all papers
*/
interface GeneralStatsContentProps {
	totalPapers: number;
	readPapers: number;
	unreadPapers: number;
	totalSize: number;
}

function GeneralStatsContent({
	totalPapers,
	readPapers,
	unreadPapers,
	totalSize,
}: GeneralStatsContentProps) {
	return (
		<Box flexDirection="column" height="100%">
			<Box height={1}>
				<Text>Total Papers: {totalPapers}</Text>
			</Box>
			<Box height={1}>
				<Text>Read Papers: {readPapers}</Text>
			</Box>
			<Box height={1}>
				<Text>Unread Papers: {unreadPapers}</Text>
			</Box>
			<Box height={1}>
				<Text>Total Size: {formatFileSize(totalSize)}</Text>
			</Box>
		</Box>
	);
}

function SelectedPaperInfoPanel() {
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
					<SelectedPaperInfoContent />
				</CardContent>
			</Card>
		</Box>
	);
}

/*
Shows the info for the currently selected paper that won't fit in the list/table.
Normal Table Info:
- Title
- File Size
- Downloaded Date
- Favorited status

This components Info:
- Authors 
- Published Date
- Catagories 
- Abstract
*/
function SelectedPaperInfoContent() {
	const {selectedPaper} = useSelectedPaper();

	if (!selectedPaper) {
		return <Text>No paper selected</Text>;
	}

	return (
		<Box flexDirection="column" height="100%">
			{/* Authors with fixed height */}
			<Box height={2}>
				<Text wrap="truncate">Authors: {selectedPaper.authors.join(', ')}</Text>
			</Box>

			{/* Date with fixed height */}
			<Box height={1}>
				<Text>Published: {selectedPaper.published.toLocaleDateString()}</Text>
			</Box>

			{/* Categories with fixed height */}
			<Box height={1}>
				<Text wrap="truncate">
					Categories: {selectedPaper.categories.join(', ')}
				</Text>
			</Box>

			{/* Abstract with flex grow to fill remaining space */}
			<Box flexGrow={1} marginTop={1} overflow="hidden">
				<Text wrap="wrap">
					Abstract: {truncateToCharCount(selectedPaper.abstract, 650)}
				</Text>
			</Box>
		</Box>
	);
}

// Shared columns definition for paper tables
const getPaperColumns = (): Column<LocalPaper>[] => [
	{
		key: 'title',
		header: 'Title',
		flex: 2,
	},
	{
		key: 'fileSize',
		header: 'Size',
		width: 14,
		align: 'right',
		render: row => formatFileSize(row.fileSize),
	},
	{
		key: 'downloadedAt',
		header: 'Downloaded',
		width: 18,
		render: row => formatDate(row.downloadedAt),
	},
];

function PaperListPanel() {
	enum SelectedTab {
		Read = 'read',
		Unread = 'unread',
	}

	const tabs = [
		{label: 'Unread', value: SelectedTab.Unread},
		{label: 'Read', value: SelectedTab.Read},
	];

	const [selectedTab, setSelectedTab] = useState<SelectedTab>(
		SelectedTab.Unread,
	);
	const [tabIndex, setTabIndex] = useState(0);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const {setSelectedPaper} = useSelectedPaper();

	// Get the papers for the current tab to determine max index
	const {data: readPapers} = useLocalPapers('read');
	const {data: unreadPapers} = useLocalPapers('unread');

	// Update selected paper when index changes
	useEffect(() => {
		let currentPapers;
		switch (selectedTab) {
			case SelectedTab.Read:
				currentPapers = readPapers;
				break;
			case SelectedTab.Unread:
				currentPapers = unreadPapers;
				break;
		}

		if (
			currentPapers &&
			currentPapers.length > 0 &&
			selectedIndex >= 0 &&
			selectedIndex < currentPapers.length
		) {
			setSelectedPaper(currentPapers[selectedIndex] || null);
		} else {
			setSelectedPaper(null);
		}
	}, [selectedIndex, selectedTab, readPapers, unreadPapers, setSelectedPaper]);

	// Get the current max index based on the selected tab
	const getMaxIndex = () => {
		switch (selectedTab) {
			case SelectedTab.Read:
				return (readPapers?.length ?? 0) - 1;
			case SelectedTab.Unread:
				return (unreadPapers?.length ?? 0) - 1;
			default:
				return 0;
		}
	};

	useInput((input, key) => {
		if (key.leftArrow) {
			const newIndex = (tabIndex - 1 + tabs.length) % tabs.length;
			setTabIndex(newIndex);
			setSelectedTab(tabs[newIndex]?.value || SelectedTab.Unread);
			setSelectedIndex(0); // Reset selection when changing tabs
		} else if (key.rightArrow) {
			const newIndex = (tabIndex + 1) % tabs.length;
			setTabIndex(newIndex);
			setSelectedTab(tabs[newIndex]?.value || SelectedTab.Unread);
			setSelectedIndex(0); // Reset selection when changing tabs
		} else if (key.upArrow) {
			setSelectedIndex(i => Math.max(0, i - 1));
		} else if (key.downArrow) {
			setSelectedIndex(i => Math.min(getMaxIndex(), i + 1));
		} else if (input === 'q' || (key.ctrl && input === 'c')) {
			// Exit application when 'q' is pressed or Ctrl+C
			process.exit(0);
		}
	});

	// Render the active tab content based on the selected tab
	const renderTabContent = () => {
		switch (selectedTab) {
			case SelectedTab.Read:
				return <ReadPaperListContent selectedIndex={selectedIndex} />;
			case SelectedTab.Unread:
				return <UnreadPaperListContent selectedIndex={selectedIndex} />;
			default:
				return null;
		}
	};

	return (
		<Box height="100%" width="100%">
			<Card height="100%" width="100%">
				<CardHeader>
					<Box marginBottom={1}>
						{tabs.map((tab, index) => (
							<Box key={tab.value} marginRight={1}>
								<Badge color={index === tabIndex ? 'blue' : 'gray'}>
									{tab.label}
								</Badge>
							</Box>
						))}
					</Box>
				</CardHeader>
				<CardContent>{renderTabContent()}</CardContent>
			</Card>
		</Box>
	);
}

/*
Shows the list of papers in a table.
- Title
- File Size
- Downloaded Date
- Favorited status
*/
interface PaperListContentProps {
	selectedIndex: number;
}

function ReadPaperListContent({selectedIndex}: PaperListContentProps) {
	const {data: papers = [], isLoading, error} = useLocalPapers('read');
	const [termWidth, termHeight] = useStdoutDimensions();

	// Memoize the Table to prevent unnecessary re-renders
	const tableContent = useMemo(() => {
		if (isLoading) return <Text>Loading read papers...</Text>;
		if (error)
			return <Text color="red">Error loading papers: {error.message}</Text>;
		if (papers.length === 0) return <Text>No read papers found</Text>;

		return (
			<Table
				columns={getPaperColumns()}
				data={papers}
				selectedIndex={selectedIndex}
				highlightColumnIndex={0}
				headerHeight={1}
			/>
		);
	}, [papers, selectedIndex, isLoading, error, termWidth, termHeight]);

	return <Box height="100%">{tableContent}</Box>;
}

function UnreadPaperListContent({selectedIndex}: PaperListContentProps) {
	const {data: papers = [], isLoading, error} = useLocalPapers('unread');
	const [termWidth, termHeight] = useStdoutDimensions();

	// Memoize the Table to prevent unnecessary re-renders
	const tableContent = useMemo(() => {
		if (isLoading) return <Text>Loading unread papers...</Text>;
		if (error)
			return <Text color="red">Error loading papers: {error.message}</Text>;
		if (papers.length === 0) return <Text>No unread papers found</Text>;

		return (
			<Table
				columns={getPaperColumns()}
				data={papers}
				selectedIndex={selectedIndex}
				highlightColumnIndex={0}
				headerHeight={1}
			/>
		);
	}, [papers, selectedIndex, isLoading, error, termWidth, termHeight]);

	return <Box height="100%">{tableContent}</Box>;
}
