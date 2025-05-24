import React from 'react';

import Library from './screens/library.js';
import PaperFinder from './screens/paper-finder.js';
import Reader from './screens/reader.js';

import {Box} from 'ink';
import {Router, useNavigation, type ScreenName} from './router.js';

const screens: Record<
	ScreenName,
	{name: string; component: React.ComponentType}
> = {
	library: {name: 'Library', component: Library},
	'paper-finder': {name: 'Paper Finder', component: PaperFinder},
	reader: {name: 'Reader', component: Reader},
};

// @ts-ignore
export default function App({query}: {query: string}) {
	return (
		<Router initialScreen="library">
			<AppContent />
		</Router>
	);
}

function AppContent() {
	const {currentScreen} = useNavigation();
	const CurrentComponent = screens[currentScreen].component;

	return (
		<Box flexDirection="column" height="100%">
			<CurrentComponent />
		</Box>
	);
}
