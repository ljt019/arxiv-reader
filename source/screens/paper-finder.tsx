import React from 'react';
import {Box, Text, useInput} from 'ink';
import {useNavigation} from '../router.js';

export default function PaperFinder() {
	const {navigate} = useNavigation();

	// @ts-ignore
	useInput((input, key) => {
		if (input === 'l') {
			navigate('library');
		} else if (input === 'r') {
			navigate('reader');
		}
	});

	return (
		<Box flexDirection="column" padding={1}>
			<Text bold color="green">
				Paper Finder
			</Text>
			<Box marginTop={1}>
				<Text>Find and download papers from arXiv</Text>
			</Box>
			<Box marginTop={2} flexDirection="column">
				<Text dimColor>Navigation:</Text>
				<Text dimColor>• Press 'l' to go to Library</Text>
				<Text dimColor>• Press 'r' to go to Reader</Text>
			</Box>
		</Box>
	);
}
