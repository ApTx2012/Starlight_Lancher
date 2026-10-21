const amountFormatter = new Intl.NumberFormat('zh-CN', {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
	useGrouping: false,
})

export function formatDonationAmount(amount: string): string {
	const value = Number(amount)
	return amount.trim() && Number.isFinite(value) ? `￥${amountFormatter.format(value)}` : '—'
}
