import { defineMessages } from '@modrinth/ui'

export const messages = defineMessages({
	title: { id: 'app.easteregg.color-mine.title', defaultMessage: 'Starlight Mine: Chromatic Realms' },
	easy: { id: 'app.easteregg.color-mine.easy', defaultMessage: 'Easy' },
	normal: { id: 'app.easteregg.color-mine.normal', defaultMessage: 'Normal' },
	hard: { id: 'app.easteregg.color-mine.hard', defaultMessage: 'Hard' },
	newGame: { id: 'app.easteregg.color-mine.newGame', defaultMessage: 'New board' },
	close: { id: 'app.easteregg.color-mine.close', defaultMessage: 'Close' },
	choose: {
		id: 'app.easteregg.color-mine.choose',
		defaultMessage: 'Click a revealed tile to sample its color, then paint a gray tile.',
	},
	selected: {
		id: 'app.easteregg.color-mine.selected',
		defaultMessage: 'Color {color} selected · Click a colored tile to change your brush.',
	},
	rulesTitle: { id: 'app.easteregg.color-mine.rulesTitle', defaultMessage: 'How to play' },
	rules: {
		id: 'app.easteregg.color-mine.rules',
		defaultMessage:
			'Numbers count same-color tiles in the eight surrounding spaces, excluding the tile itself. Each color forms one connected region using only horizontal and vertical edges. Sample a revealed tile to select a brush; a correct paint reveals a new number, but one wrong paint ends the game. Every board has a step-by-step deduction path without guessing.',
	},
	loading: {
		id: 'app.easteregg.color-mine.loading',
		defaultMessage: 'Generating regions and checking the deduction path…',
	},
	generateError: {
		id: 'app.easteregg.color-mine.generateError',
		defaultMessage: 'Could not generate this board. Try again.',
	},
	retry: { id: 'app.easteregg.color-mine.retry', defaultMessage: 'Try again' },
	progress: {
		id: 'app.easteregg.color-mine.progress',
		defaultMessage: '{count} / {total} revealed',
	},
	best: { id: 'app.easteregg.color-mine.best', defaultMessage: 'Best · {time}' },
	won: { id: 'app.easteregg.color-mine.won', defaultMessage: 'All colors restored!' },
	lost: {
		id: 'app.easteregg.color-mine.lost',
		defaultMessage:
			'Wrong color at row {row}, column {column}: selected {selected}, correct {correct}. Game over.',
	},
	review: {
		id: 'app.easteregg.color-mine.review',
		defaultMessage: 'Unrevealed answers are now shown faded for review.',
	},
	leaveTitle: { id: 'app.easteregg.color-mine.leaveTitle', defaultMessage: 'Leave this board?' },
	leaveText: {
		id: 'app.easteregg.color-mine.leaveText',
		defaultMessage: 'Save to continue later, or discard this unfinished board.',
	},
	saveLeave: { id: 'app.easteregg.color-mine.saveLeave', defaultMessage: 'Save and leave' },
	discard: { id: 'app.easteregg.color-mine.discard', defaultMessage: 'Discard' },
	continue: { id: 'app.easteregg.color-mine.continue', defaultMessage: 'Keep playing' },
	replaceTitle: {
		id: 'app.easteregg.color-mine.replaceTitle',
		defaultMessage: 'Start a new board?',
	},
	replaceText: {
		id: 'app.easteregg.color-mine.replaceText',
		defaultMessage: 'The current board will be discarded.',
	},
	savedTitle: {
		id: 'app.easteregg.color-mine.savedTitle',
		defaultMessage: 'An unfinished board is saved',
	},
	resume: { id: 'app.easteregg.color-mine.resume', defaultMessage: 'Resume saved game' },
	storageError: {
		id: 'app.easteregg.color-mine.storageError',
		defaultMessage:
			'Could not read or write the saved game. Your current board has been kept. Retry or explicitly discard it.',
	},
	recordError: {
		id: 'app.easteregg.color-mine.recordError',
		defaultMessage: 'Finished, but the best time could not be saved.',
	},
	zoomIn: { id: 'app.easteregg.color-mine.zoomIn', defaultMessage: 'Zoom in' },
	zoomOut: { id: 'app.easteregg.color-mine.zoomOut', defaultMessage: 'Zoom out' },
	map: { id: 'app.easteregg.color-mine.map', defaultMessage: 'Board overview. Click to navigate.' },
	board: {
		id: 'app.easteregg.color-mine.board',
		defaultMessage: '{size} by {size} color deduction board',
	},
	hidden: {
		id: 'app.easteregg.color-mine.hidden',
		defaultMessage: 'Row {row}, column {column}, unrevealed',
	},
	revealed: {
		id: 'app.easteregg.color-mine.revealed',
		defaultMessage: 'Row {row}, column {column}, color {color}, {number} same-color neighbors',
	},
})
