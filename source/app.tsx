import React from 'react';
import {Text, Box} from 'ink';
import {useArxivSearch} from './services/arxiv.js';

export default function App({query}: {query: string}) {
	const {data, isLoading, error} = useArxivSearch(query, {
		maxResults: 5,
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
		</Box>
	);
}
