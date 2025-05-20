import React, {useEffect, useState} from 'react';
import {Buffer} from 'buffer';
import * as sixel from 'sixel';
import {Text, useStdout, Box} from 'ink';
import sharp from 'sharp';

/*
 * Props for the Image component that renders images using sixel encoding
 *
 * @param dataUri - Base64 encoded data URI containing the image data
 * @param width - Optional width to resize image to (default: 800px)
 * @param height - Optional height to resize image to (default: 600px)
 * @param maxColors - Optional maximum number of colors to use in sixel output (default: 256)
 */
interface ImageProps {
	dataUri: string;
	width?: number;
	height?: number;
	maxColors?: number;
}

function Image({
	dataUri,
	width = 800,
	height = 600,
	maxColors = 256,
}: ImageProps): React.ReactElement {
	const [error, setError] = useState<string | null>(null);
	const {write} = useStdout();

	useEffect(() => {
		const generateImage = async () => {
			if (!dataUri) {
				setError('Image data URI is empty.');
				return;
			}

			let imageBuffer: Buffer;
			try {
				const base64Data = dataUri.split(',')[1];
				if (!base64Data) {
					setError('Invalid image data URI: missing Base64 data.');
					return;
				}
				imageBuffer = Buffer.from(base64Data, 'base64');

				if (imageBuffer.length === 0) {
					setError('Image buffer is empty after conversion.');
					return;
				}
			} catch (e) {
				setError(
					'Failed to convert data URI to buffer: ' +
						(e instanceof Error ? e.message : String(e)),
				);
				return;
			}

			try {
				// Process the image with sharp for sixel rendering
				const {data, info} = await sharp(imageBuffer)
					.resize({width, height, fit: 'inside'})
					.ensureAlpha()
					.raw()
					.toBuffer({resolveWithObject: true});

				// Create image data that sixel can understand
				const pixelData = new Uint8ClampedArray(data);

				// Use sixel's image2sixel function
				const sixelData = sixel.image2sixel(
					pixelData,
					info.width,
					info.height,
					maxColors,
					0,
				);

				// Write directly to stdout
				write(sixelData);
			} catch (err) {
				console.error('Image rendering error:', err);
				setError(err instanceof Error ? err.message : String(err));
			}
		};

		generateImage();
	}, [dataUri, width, height, maxColors, write]);

	if (error) {
		return <Text color="red">Error rendering image: {error}</Text>;
	}

	// Reserve minimal vertical space
	return <Box height={1}></Box>;
}

export default Image;
