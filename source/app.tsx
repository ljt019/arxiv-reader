import React from 'react';
import Index from './screens/index.js';

export default function App({query}: {query: string}) {
	return <Index query={query} />;
}
