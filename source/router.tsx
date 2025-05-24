import React, {useState, createContext, useContext} from 'react';

// Define available screens
export type ScreenName = 'library' | 'paper-finder' | 'reader';

// Router Context
interface RouterContextType {
	currentScreen: ScreenName;
	navigate: (screen: ScreenName) => void;
}

const RouterContext = createContext<RouterContextType | null>(null);

// Hook to use navigation in screen components
export function useNavigation() {
	const context = useContext(RouterContext);
	if (!context) {
		throw new Error('useNavigation must be used within a Router');
	}
	return context;
}

// Router Provider Component
export function Router({
	children,
	initialScreen = 'library',
}: {
	children: React.ReactNode;
	initialScreen?: ScreenName;
}) {
	const [currentScreen, setCurrentScreen] = useState<ScreenName>(initialScreen);

	function navigate(screen: ScreenName) {
		// Clear the screen before showing the new one
		console.clear();

		setCurrentScreen(screen);
	}

	const navigationContext: RouterContextType = {
		currentScreen,
		navigate,
	};

	return (
		<RouterContext.Provider value={navigationContext}>
			{children}
		</RouterContext.Provider>
	);
}
