p = r"D:\Project\Starlight_Lancher\apps\app-frontend\src\components\ui\Breadcrumbs.vue"
t = open(p, encoding="utf-8").read()

old = """function resolveLabel(name: string): string {
	return resolveBreadcrumbLabel(
		name,
		(key) => breadcrumbData.getName(key),
		staticLabels,
		(message) => formatMessage(message),
	)
}"""
new = """function resolveLabel(name: string): string {
	return resolveBreadcrumbLabel(
		name,
		(key) => breadcrumbData.getName(key) || fallbackDynamicLabel(key),
		staticLabels,
		(message) => formatMessage(message),
	)
}

// 动态面包屑（?Xxx）在页面异步 setName 之前，回退到静态标签，避免图标与文字不同步
function fallbackDynamicLabel(key: string): string {
	const fallback: Record<string, keyof typeof staticLabels> = {
		BrowseTitle: 'Discover content',
	}
	const staticKey = fallback[key]
	return staticKey ? formatMessage(staticLabels[staticKey]) : ''
}"""

assert old in t, "resolveLabel 找不到"
t = t.replace(old, new, 1)
open(p, "w", encoding="utf-8", newline="\n").write(t)
print("done")