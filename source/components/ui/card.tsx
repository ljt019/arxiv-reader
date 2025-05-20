import React from 'react';
import {Box, BoxProps} from 'ink';

interface CardProps extends BoxProps {
	children: React.ReactNode;
}

function Card({children, ...props}: CardProps) {
	return (
		<Box
			borderStyle="round"
			flexDirection="column"
			paddingX={1}
			paddingY={0}
			{...props}
		>
			{children}
		</Box>
	);
}

function CardHeader({children, ...props}: CardProps) {
	return (
		<Box flexDirection="column" marginBottom={0} {...props}>
			{children}
		</Box>
	);
}

function CardTitle({children, ...props}: CardProps) {
	return (
		<Box marginBottom={0} {...props}>
			{children}
		</Box>
	);
}

function CardDescription({children, ...props}: CardProps) {
	return (
		<Box marginBottom={1} {...props}>
			{children}
		</Box>
	);
}

function CardContent({children, ...props}: CardProps) {
	return (
		<Box flexDirection="column" paddingX={1} {...props}>
			{children}
		</Box>
	);
}

function CardFooter({children, ...props}: CardProps) {
	return (
		<Box flexDirection="row" alignItems="center" marginTop={1} {...props}>
			{children}
		</Box>
	);
}

export {Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter};

/*

Example of how I want this to work:

<Card>
  <CardHeader>
    <CardTitle>
      <Text>Title</Text>
    </CardTitle>
    <CardDescription>
      <Text>Description</Text>
    </CardDescription>
  </CardHeader>
  <CardContent>
    <Text>Content</Text>
  </CardContent>
  <CardFooter>
    <Text>Footer</Text>
  </CardFooter>
</Card>

*/
