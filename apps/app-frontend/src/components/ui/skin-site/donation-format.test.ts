import assert from 'node:assert/strict'
import test from 'node:test'

import { formatDonationAmount } from './donation-format.ts'

test('donation totals and individual amounts carry yuan and exactly two decimals', () => {
	for (const [amount, expected] of [
		['12794.57', '￥12794.57'],
		['300', '￥300.00'],
		['0.1', '￥0.10'],
		['1.005', '￥1.01'],
		['0', '￥0.00'],
	]) {
		assert.equal(formatDonationAmount(amount), expected)
	}
})

test('invalid amounts do not show a made-up zero donation', () => {
	for (const amount of ['', 'unknown', 'Infinity']) assert.equal(formatDonationAmount(amount), '—')
})
