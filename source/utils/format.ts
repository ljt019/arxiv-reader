// Helper function to format file size in bytes to a human-readable string
export const formatFileSize = (bytes: number): string => {
	if (bytes < 1024) return `${bytes} B`;
	else if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	else if (bytes < 1024 * 1024 * 1024)
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	else return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

// Helper function to format timestamp to a human-readable date
export const formatDate = (timestamp: number): string => {
	return new Date(timestamp).toLocaleDateString();
};

// Helper function to truncate text to a specified number of sentences
export const truncateSentences = (
	text: string,
	sentenceCount: number = 3,
): string => {
	// Simple regex to split by sentence endings (., !, ?)
	const sentences = text.split(/(?<=[.!?])\s+/);
	if (sentences.length <= sentenceCount) {
		return text;
	}

	return sentences.slice(0, sentenceCount).join(' ') + '...';
};

// Helper function to truncate text to a specified number of words
export const truncateToWordCount = (
	text: string,
	wordCount: number = 100,
): string => {
	const words = text.split(/\s+/);
	if (words.length <= wordCount) {
		return text;
	}

	return words.slice(0, wordCount).join(' ') + '...';
};

// Helper function to truncate text to a specified number of characters
export const truncateToCharCount = (
	text: string,
	charCount: number = 300,
): string => {
	if (text.length <= charCount) {
		return text;
	}

	// Try to end at a word boundary if possible
	let end = charCount;
	while (end > charCount - 20 && end > 0 && !/\s/.test(text.charAt(end))) {
		end--;
	}

	// If we couldn't find a space, just cut at the exact character
	if (end === charCount - 20 || end === 0) {
		end = charCount;
	}

	return text.substring(0, end) + '...';
};
