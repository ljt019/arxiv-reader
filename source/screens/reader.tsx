import React from 'react';
import {Box, Text, useInput} from 'ink';
import {useNavigation} from '../router.js';

export default function Reader() {
	const {navigate} = useNavigation();

	// @ts-ignore
	useInput((input, key) => {
		if (input === 'l') {
			navigate('library');
		} else if (input === 'f') {
			navigate('paper-finder');
		}
	});

	return (
		<Box flexDirection="column" padding={1}>
			<Text bold color="blue">
				Reader
			</Text>
			<Box marginTop={1}>
				<Text>Read and annotate your papers</Text>
			</Box>
			<Box marginTop={2} flexDirection="column">
				<Text dimColor>Navigation:</Text>
				<Text dimColor>• Press 'l' to go to Library</Text>
				<Text dimColor>• Press 'f' to go to Paper Finder</Text>
			</Box>
		</Box>
	);
}
