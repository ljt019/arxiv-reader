import React from 'react';
import {Text, Box, type BoxProps, type TextProps} from 'ink';

/**
 * Props for the Divider component.
 */
interface DividerProps {
	/**
	 * Title shown in the middle of the divider.
	 *
	 * @example
	 * ```tsx
	 * <Divider title="Title" />
	 *
	 * // ─────────── Title ───────────
	 * ```
	 *
	 * @default null
	 */
	title?: string;

	/**
	 * Width of the divider.
	 *
	 * @example
	 * ```tsx
	 * <Divider width={50} />
	 *
	 * // ──────────────────────────────────────────────────
	 * ```
	 * @default 'auto'
	 */
	width?: 'auto' | number;

	/**
	 * Padding at the start and the end of the divider.
	 *
	 * @example
	 * ```tsx
	 * <Divider padding={2} />
	 *
	 * // ··─────────────────────────────··
	 * ```
	 * @default 0
	 */
	padding?: number;

	/**
	 * Padding besides the title in the middle.
	 *
	 * @example
	 * ```tsx
	 * <Divider title="My title" titlePadding={3} />
	 *
	 * // ─────────   Title   ─────────
	 * ```
	 *
	 * @default 1
	 */
	titlePadding?: number;

	/**
	 * Color of the title.
	 *
	 * @example
	 * ```tsx
	 * <Divider title="My title" titleColor="green" />
	 * ```
	 *
	 * @default 'white'
	 */
	titleColor?: TextProps['color'];

	/**
	 * Char used as a divider.
	 *
	 * @example
	 * ```tsx
	 * <Divider dividerChar="=" />
	 *
	 * // =============================
	 * ```
	 *
	 * @default '─'
	 */
	dividerChar?: string;

	/**
	 * Color of the divider's border. Matches the type of `borderColor` in the Ink `Box` component.
	 * Accepts standard Ink color names or hex codes.
	 *
	 * @example
	 * ```tsx
	 * <Divider dividerColor="red" />
	 * ```
	 *
	 * @default 'gray'
	 */
	dividerColor?: BoxProps['borderColor'];

	/**
	 * Additional props to be passed to the underlying Ink `Box` component.
	 *
	 *  @example
	 * ```tsx
	 * <Divider boxProps={{ marginTop: 2 }} />
	 *
	 *
	 * //
	 * //
	 * //  ─────────────────────────────
	 * ```
	 */
	boxProps?: BoxProps;

	/**
	 * Array of segment widths for creating a divider that aligns with table columns.
	 * When provided, renders a multi-segment divider with each segment having the specified width.
	 *
	 * @example
	 * ```tsx
	 * <Divider segments={[10, 20, 15]} segmentGap={2} />
	 *
	 * // ────────── (gap) ────────────────────── (gap) ─────────────
	 * ```
	 */
	segments?: number[];

	/**
	 * Gap between segments when using the segments prop.
	 *
	 * @default 1
	 */
	segmentGap?: number;
}

const BaseDivider: React.FC<DividerProps> = ({
	width = 'auto',
	dividerChar,
	dividerColor = 'gray',
	boxProps,
}) => (
	<Box
		width={width}
		// @ts-expect-error
		borderStyle={{
			bottom: dividerChar,
		}}
		borderColor={dividerColor}
		//
		flexGrow={1}
		//
		borderBottom={true}
		//
		borderTop={false}
		borderLeft={false}
		borderRight={false}
		//
		{...boxProps}
	/>
);

/**
 * Creates a segmented divider with specified widths and gaps
 */
const SegmentedDivider: React.FC<{
	segments: number[];
	segmentGap: number;
	dividerChar?: string;
	dividerColor?: BoxProps['borderColor'];
}> = ({segments, segmentGap, dividerChar = '─', dividerColor = 'gray'}) => {
	return (
		<Box flexDirection="row">
			{segments.map((width, index) => (
				<React.Fragment key={index}>
					<Box
						width={width}
						// @ts-expect-error
						borderStyle={{
							bottom: dividerChar,
						}}
						borderColor={dividerColor}
						borderBottom={true}
						borderTop={false}
						borderLeft={false}
						borderRight={false}
					/>
					{index < segments.length - 1 && <Box width={segmentGap} />}
				</React.Fragment>
			))}
		</Box>
	);
};

/**
 * A horizontal divider component styled as a single border line.
 *
 * @example
 * ```tsx
 * import { render } from 'ink'
 * import Divider from 'ink-divider'
 *
 * render(<Divider title='Title' />)
 *
 * // ─────────── Title ───────────
 * ```
 *
 * @returns A styled divider.
 */
const Divider: React.FC<DividerProps> = ({
	title,
	width = 'auto',
	padding = 0,
	titlePadding = 1,
	titleColor = 'white',
	dividerChar = '─',
	dividerColor = 'gray',
	boxProps,
	segments,
	segmentGap = 1,
}) => {
	// If segments are provided, render a segmented divider
	if (segments && segments.length > 0) {
		return (
			<Box paddingLeft={padding} paddingRight={padding}>
				<SegmentedDivider
					segments={segments}
					segmentGap={segmentGap}
					dividerChar={dividerChar}
					dividerColor={dividerColor}
				/>
			</Box>
		);
	}

	const dividerLine = (
		<BaseDivider
			dividerChar={dividerChar}
			dividerColor={dividerColor}
			boxProps={boxProps}
		/>
	);

	// If there is no title, return only the divider line
	if (!title) {
		return (
			<Box width={width} paddingLeft={padding} paddingRight={padding}>
				{dividerLine}
			</Box>
		);
	}

	// Otherwise, return the divider line with the title in the middle
	return (
		<Box
			width={width}
			paddingLeft={padding}
			paddingRight={padding}
			gap={titlePadding}
		>
			{dividerLine}

			<Box>
				<Text color={titleColor}>{title}</Text>
			</Box>

			{dividerLine}
		</Box>
	);
};

export default Divider;
