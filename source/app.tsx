import React, {useState} from 'react';
import {Text, Box, useInput, useApp, useStdout} from 'ink';
import Image from './components/image.js';
import {ImagePart} from './utils/extractPartsFromResult.js';

import usePdfToMarkdown from './services/docling.js';

const pdf_path =
	'C:\\Users\\lucie\\Desktop\\reading_list\\to_read\\distilling_step_by_step.pdf';

export default function App() {
	const app = useApp();
	const {write} = useStdout();
	const [currentImageIndex, setCurrentImageIndex] = useState(0);

	const {data: parts, isLoading, error: pdfError} = usePdfToMarkdown(pdf_path);

	const imageParts = parts
		?.filter(
			(part: any): part is ImagePart => part.type === 'image' && 'data' in part,
		)
		.filter(Boolean);

	useInput((input, key) => {
		if (input === 'q') {
			console.log('Checkpoint Mayday');
			app.exit();
		}
		if (key.leftArrow) {
			// Clear some lines when changing images
			write('\x1b[2J\x1b[H');
			setCurrentImageIndex(prevIndex => Math.max(0, prevIndex - 1));
		} else if (key.rightArrow && imageParts) {
			// Clear some lines when changing images
			write('\x1b[2J\x1b[H');
			setCurrentImageIndex(prevIndex =>
				Math.min(imageParts.length - 1, prevIndex + 1),
			);
		}
	});

	if (isLoading) {
		return <Text>Loading PDF...</Text>;
	}

	if (pdfError) {
		return <Text color="red">Error processing PDF: {pdfError.message}</Text>;
	}

	if (!parts) {
		return <Text>No content to display.</Text>;
	}

	if (!imageParts || imageParts.length === 0) {
		return (
			<Box flexDirection="column">
				<Text>No images found in the PDF.</Text>
			</Box>
		);
	}

	const currentImage = imageParts[currentImageIndex];
	if (!currentImage) {
		return (
			<Box flexDirection="column">
				<Text>Error: Image not found at index {currentImageIndex}.</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column">
			<Box marginY={1}>
				<Image dataUri={currentImage.data} />
			</Box>
			<Text>
				Image {currentImageIndex + 1} of {imageParts.length} (Press 'q' to
				exiter)
			</Text>
		</Box>
	);
}
