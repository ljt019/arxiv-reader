import React, {useState} from 'react';
import {Text, Box, useInput} from 'ink';
import {useApp} from 'ink';
import {useArxivSearch} from '../services/arxiv.js';
import {useDownloadPaper} from '../services/local_papers.js';

export default function Index({query}: {query: string}) {
	const app = useApp();

	const {data, isLoading, error} = useArxivSearch(query, {
		maxResults: 5,
	});
	const [downloadStatus, setDownloadStatus] = useState<string | null>(null);

	const downloadMutation = useDownloadPaper({
		onSuccess: paper => {
			setDownloadStatus(`Paper "${paper.title}" is available locally`);
		},
		onError: err => {
			setDownloadStatus(`Error downloading: ${err.message}`);
		},
	});

	useInput(input => {
		if (input === 'd' && data && data.length > 0 && data[0]) {
			setDownloadStatus('Processing paper...');
			downloadMutation.mutate(data[0]);
		}

		if (input === 'q') {
			app.exit();
		}
	});

	if (isLoading) {
		return <Text>Loading papers...</Text>;
	}

	if (error) {
		return <Text color="red">Error: {error.message}</Text>;
	}

	if (!data || data.length === 0) {
		return <Text>No papers found.</Text>;
	}

	return (
		<Box flexDirection="column">
			<Text>{`Papers about: "${query}"`}</Text>
			{data.map(paper => (
				<Text key={paper.id}>- {paper.title}</Text>
			))}

			<Box marginTop={1}>
				<Text>Press 'd' to download the first paper | Press 'q' to quit</Text>
			</Box>

			{downloadStatus && (
				<Box marginTop={1}>
					<Text color={downloadStatus.includes('Error') ? 'red' : 'green'}>
						{downloadStatus}
					</Text>
				</Box>
			)}
		</Box>
	);
}
