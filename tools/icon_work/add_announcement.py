
p = r"D:\Project\Starlight_Lancher\apps\app-frontend\src\announcements\catalog.ts"
t = open(p, encoding="utf-8").read()

entry = """	{
		id: 'launcher-1.0.0-beta1',
		version: '1.0.0-beta1',
		publishedAt: '2026-09-13',
		title: {
			'en-US': 'Starlight Launcher 1.0.0-beta1',
			'zh-CN': 'Starlight Launcher 1.0.0-beta1',
		},
		changes: {
			changed: [
				{
					'en-US':
						'The launcher has been rebranded from Axolotl Launcher to Starlight Launcher, with a new icon and a refreshed about page.',
					'zh-CN': '启动器已从 Axolotl Launcher 更名为 Starlight Launcher，并更换了全新图标与关于页。',
				},
				{
					'en-US':
						'The "Powered by" and copyright notices now correctly credit Axolotl Launcher as the upstream project.',
					'zh-CN': '版权与 "Powered by" 署名现在正确标注上游项目 Axolotl Launcher。',
				},
				{
					'en-US': 'The developer list on the about page now shows Ax_Tps and Disy920.',
					'zh-CN': '关于页的开发组现在显示 Ax_Tps 与 Disy920。',
				},
			],
			added: [
				{
					'en-US': 'A "Starlight" entry was added to the sidebar, which embeds the StarLight skin site.',
					'zh-CN': '侧边栏新增「斯达莱特」入口，内嵌 StarLight 皮肤站。',
				},
				{
					'en-US':
						'A launch progress panel was added to the home sidebar, showing the current launch stage and progress.',
					'zh-CN': '主页侧边栏新增启动进度面板，显示当前启动阶段与进度。',
				},
				{
					'en-US':
						'An easter egg mini-game (star merge) was added, reachable via the secret code "starlight", the Konami code, or a long press on a developer name on the about page.',
					'zh-CN':
						'新增彩蛋小游戏（下界之星合成），可通过暗号 starlight、Konami 秘技或长按关于页开发者名字触发。',
				},
			],
			removed: [
				{
					'en-US':
						'The hard-coded Starlight official server was removed from "Pinned servers"; only servers you favorite yourself are shown now.',
					'zh-CN': '移除了「固定的服务器」中写死的 Starlight 官方服务器，现在只显示你自己收藏的服务器。',
				},
				{
					'en-US': 'The swimming axolotl animation on the about page was replaced with a static nether star.',
					'zh-CN': '关于页中游动的美西螈动画已替换为静止的下界之星。',
				},
			],
			fixed: [
				{
					'en-US':
						'Minecraft now launches in a maximized window when the maximize option is enabled.',
					'zh-CN': '启用最大化选项后，Minecraft 现在会以最大化窗口启动。',
				},
			],
		},
	},
"""

anchor = "export const launcherAnnouncements: readonly LauncherAnnouncement[] = [\n"
assert anchor in t, "找不到数组开头"
t = t.replace(anchor, anchor + entry, 1)

open(p, "w", encoding="utf-8", newline="\n").write(t)
print("done")
