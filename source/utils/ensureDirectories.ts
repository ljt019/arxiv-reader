import fs from 'fs';
import {
	docling_cache_directory,
	read_paper_directory,
	unread_paper_directory,
} from '../constants/index.js';

/**
 * Ensures that all application directories exist
 * Creates them if they don't exist
 */
export const ensureDirectories = () => {
	const directoriesToCreate = [
		docling_cache_directory,
		read_paper_directory,
		unread_paper_directory,
	];

	for (const dir of directoriesToCreate) {
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, {recursive: true});
		}
	}
};
