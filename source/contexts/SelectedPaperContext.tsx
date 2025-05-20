import React, {createContext, useContext, useState, ReactNode} from 'react';
import {LocalPaper} from '../services/local_papers.js';

interface SelectedPaperContextType {
	selectedPaper: LocalPaper | null;
	setSelectedPaper: (paper: LocalPaper | null) => void;
}

const SelectedPaperContext = createContext<
	SelectedPaperContextType | undefined
>(undefined);

export function SelectedPaperProvider({children}: {children: ReactNode}) {
	const [selectedPaper, setSelectedPaper] = useState<LocalPaper | null>(null);

	return (
		<SelectedPaperContext.Provider value={{selectedPaper, setSelectedPaper}}>
			{children}
		</SelectedPaperContext.Provider>
	);
}

export function useSelectedPaper() {
	const context = useContext(SelectedPaperContext);
	if (context === undefined) {
		throw new Error(
			'useSelectedPaper must be used within a SelectedPaperProvider',
		);
	}
	return context;
}
