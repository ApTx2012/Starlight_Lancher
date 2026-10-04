/**
 * Starlight anniversary helpers.
 *
 * Starlight's first release was on 2014-10-04, so every October 4th the
 * launcher shows a small celebration. The anniversary number is simply
 * `currentYear - 2014`.
 */

/** Year of Starlight's first release. */
export const STARLIGHT_FOUNDING_YEAR = 2014

/** Month (1-12) of Starlight's anniversary. */
export const STARLIGHT_ANNIVERSARY_MONTH = 10

/** Day of month of Starlight's anniversary. */
export const STARLIGHT_ANNIVERSARY_DAY = 4

/**
 * Whether the given date falls on Starlight's anniversary (October 4th).
 * Uses the local timezone, which is what the launcher user experiences.
 */
export function isAnniversary(date: Date = new Date()): boolean {
	return (
		date.getMonth() + 1 === STARLIGHT_ANNIVERSARY_MONTH &&
		date.getDate() === STARLIGHT_ANNIVERSARY_DAY
	)
}

/**
 * The anniversary number for the given date (e.g. 12 for 2026).
 * Not clamped: callers decide whether to guard against pre-2014 dates.
 */
export function anniversaryYear(date: Date = new Date()): number {
	return date.getFullYear() - STARLIGHT_FOUNDING_YEAR
}

/**
 * Whether the celebration should currently be shown.
 *
 * Normally this is only true on October 4th, but the developer-page
 * `force_anniversary_celebration` feature flag forces it on for previewing.
 */
export function shouldCelebrate(force = false, date: Date = new Date()): boolean {
	return force || isAnniversary(date)
}

/** English ordinal suffix for a number (1 -> "1st", 12 -> "12th"). */
export function ordinal(n: number): string {
	const mod100 = n % 100
	if (mod100 >= 11 && mod100 <= 13) return `${n}th`
	switch (n % 10) {
		case 1:
			return `${n}st`
		case 2:
			return `${n}nd`
		case 3:
			return `${n}rd`
		default:
			return `${n}th`
	}
}