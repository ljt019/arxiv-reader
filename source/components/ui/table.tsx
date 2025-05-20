import React, {ReactNode, useMemo, useState, useEffect} from 'react';
import {Box, Text} from 'ink';
import useStdoutDimensions from '../../hooks/useStdoutDimensions.js';

/**
 * Table column configuration for type T
 */
export interface Column<T> {
	/** Unique identifier for the column */
	key: string;
	/** Column header text or node */
	header: ReactNode;
	/** Fixed character width (optional) */
	width?: number;
	/** Flex grow factor when no width specified */
	flex?: number;
	/** Text alignment within the column */
	align?: 'left' | 'center' | 'right';
	/** Custom cell renderer function */
	render?: (row: T) => ReactNode;
}

/**
 * Props for the Table component
 */
export interface TableProps<T> {
	/** Column definitions */
	columns: Column<T>[];
	/** Row data array */
	data: T[];
	/** Index of the currently selected row */
	selectedIndex: number;
	/** Height of the header in rows (default: 1) */
	headerHeight?: number;
	/** Optional footer node */
	footer?: ReactNode;
	/** Index of the column to highlight on selected row (default: 0) */
	highlightColumnIndex?: number;
	/** Callback when visible range changes */
	onVisibleRangeChange?: (start: number, end: number) => void;
}

// Type for justify content values accepted by Ink
type JustifyContent =
	| 'center'
	| 'flex-end'
	| 'flex-start'
	| 'space-between'
	| 'space-around';

/**
 * Generic table component for terminal UI
 */
export function Table<T>({
	columns,
	data,
	selectedIndex,
	headerHeight = 1,
	footer,
	highlightColumnIndex = 0,
	onVisibleRangeChange,
}: TableProps<T>) {
	// Get terminal dimensions
	const [terminalWidth, terminalHeight] = useStdoutDimensions();

	// State for scroll offset
	const [scrollOffset, setScrollOffset] = useState(0);

	// Calculate column widths based on terminal width and column configurations
	const columnWidths = useMemo(() => {
		// Start with fixed width columns
		const fixedWidths: Record<string, number> = {};
		let remainingWidth = terminalWidth;
		let totalFlex = 0;

		// Calculate fixed widths and total flex
		for (const col of columns) {
			if (col.width !== undefined) {
				fixedWidths[col.key] = col.width;
				remainingWidth -= col.width;
			} else {
				totalFlex += col.flex || 1;
			}
		}

		// Distribute remaining width by flex values
		const allWidths: Record<string, number> = {...fixedWidths};
		if (totalFlex > 0 && remainingWidth > 0) {
			for (const col of columns) {
				if (col.width === undefined) {
					const flex = col.flex || 1;
					const flexWidth = Math.max(
						1,
						Math.floor((flex / totalFlex) * remainingWidth),
					);
					allWidths[col.key] = flexWidth;
				}
			}
		}

		return allWidths;
	}, [columns, terminalWidth]);

	// Calculate visible height (available rows for data)
	const visibleHeight = terminalHeight - headerHeight - (footer ? 1 : 0);

	// Update scroll offset to keep selected row in view
	useEffect(() => {
		if (selectedIndex < 0) {
			setScrollOffset(0);
			return;
		}

		// If selected item is above current view, scroll up
		if (selectedIndex < scrollOffset) {
			setScrollOffset(selectedIndex);
			return;
		}

		// If selected item is below current view, scroll down
		if (selectedIndex >= scrollOffset + visibleHeight) {
			setScrollOffset(Math.max(0, selectedIndex - visibleHeight + 1));
			return;
		}

		// Otherwise maintain current scroll position
	}, [selectedIndex, visibleHeight, scrollOffset]);

	// Notify parent of visible range changes
	useEffect(() => {
		if (onVisibleRangeChange) {
			const endIndex = Math.min(scrollOffset + visibleHeight, data.length);
			onVisibleRangeChange(scrollOffset, endIndex);
		}
	}, [scrollOffset, visibleHeight, data.length, onVisibleRangeChange]);

	// Get visible rows
	const visibleRows = useMemo(() => {
		return data.slice(scrollOffset, scrollOffset + visibleHeight);
	}, [data, scrollOffset, visibleHeight]);

	// Helper for text alignment
	const getJustifyContent = (
		align: 'left' | 'center' | 'right',
	): JustifyContent => {
		switch (align) {
			case 'center':
				return 'center';
			case 'right':
				return 'flex-end';
			default:
				return 'flex-start';
		}
	};

	// Render cell content
	const renderCell = (
		row: T,
		column: Column<T>,
		isSelected: boolean,
		isHighlightColumn: boolean,
	) => {
		const cellContent = column.render
			? column.render(row)
			: String((row as any)[column.key] || '');

		const width = columnWidths[column.key] || 10;
		const align = column.align || 'left';

		// Apply highlighting if this is the selected row and highlight column
		return (
			<Box
				width={width}
				justifyContent={getJustifyContent(align)}
				key={column.key}
				marginRight={2}
			>
				<Text
					wrap="truncate"
					backgroundColor={isSelected && isHighlightColumn ? 'blue' : undefined}
					color={isSelected && isHighlightColumn ? 'white' : undefined}
				>
					{cellContent}
				</Text>
			</Box>
		);
	};

	return (
		<Box flexDirection="column" width={terminalWidth}>
			{/* Header row */}
			<Box flexDirection="row">
				{columns.map(column => (
					<Box
						key={`header-${column.key}`}
						width={columnWidths[column.key] || 10}
						justifyContent="flex-start"
						marginRight={2}
					>
						<Text bold>{column.header}</Text>
					</Box>
				))}
			</Box>

			{/* Simple header divider */}
			<Box
				borderStyle="single"
				borderBottom
				borderLeft={false}
				borderRight={false}
				borderTop={false}
				borderColor="gray"
				marginBottom={1}
			/>

			{/* Data rows */}
			{visibleRows.map((row, index) => {
				const isSelected = index + scrollOffset === selectedIndex;

				return (
					<Box key={`row-${index + scrollOffset}`} flexDirection="row">
						{columns.map((column, colIndex) =>
							renderCell(
								row,
								column,
								isSelected,
								colIndex === highlightColumnIndex,
							),
						)}
					</Box>
				);
			})}

			{/* Footer */}
			{footer && <Box marginTop={1}>{footer}</Box>}
		</Box>
	);
}

export default Table;
