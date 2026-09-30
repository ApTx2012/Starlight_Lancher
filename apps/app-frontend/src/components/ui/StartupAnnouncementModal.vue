<script setup lang="ts">
import { ExternalIcon, UsersIcon, XIcon } from '@modrinth/assets'
import { Avatar, ButtonStyled, NewModal } from '@modrinth/ui'
import { openUrl } from '@tauri-apps/plugin-opener'
import { ref } from 'vue'

import { teamMembers } from '@/data/about'

const modal = ref<InstanceType<typeof NewModal>>()

const SERVER_IPS: { label: string; host: string }[] = [
	{ label: '直连 IPv4', host: 'slv4.starlight.cool' },
	{ label: '直连 IPv6', host: 'slv6.starlight.cool' },
	{ label: '北方代理 IPv4', host: 'north.starlight.cool' },
	{ label: '南方代理 IPv4', host: 'south.starlight.cool' },
	{ label: '美国代理 IPv4', host: 'usa.starlight.cool' },
]

const RULES_URL = 'https://kdocs.cn/l/cmT6lVdryHJu'
const QQ_GROUP = '535392227'

function show() {
	modal.value?.show()
}

function hide() {
	modal.value?.hide()
}

function openLink(url: string) {
	void openUrl(url)
}

defineExpose({ show })
</script>

<template>
	<NewModal ref="modal" header="欢迎使用 Starlight Launcher" width="640px" max-width="640px">
		<div class="flex min-w-0 flex-col gap-5">
			<!-- 1. 开发组 -->
			<section class="flex flex-col gap-2">
				<h3 class="m-0 flex items-center gap-2 text-sm font-semibold text-contrast">
					<UsersIcon class="size-4 text-secondary" />
					开发团队
				</h3>
				<p class="m-0 text-sm text-secondary">
					本启动器由
					<span class="font-semibold text-contrast">Ax_Tps</span>
					和
					<span class="font-semibold text-contrast">Disy920</span>
					基于 Axolotl 开发。
				</p>
				<div class="grid gap-3 sm:grid-cols-2">
					<a
						v-for="member in teamMembers"
						:key="member.name"
						:href="member.url ?? undefined"
						target="_blank"
						rel="noopener noreferrer"
						class="flex min-w-0 items-center gap-3 rounded-xl bg-surface-4 p-3 transition-colors hover:bg-surface-5"
						@click.prevent="member.url && openLink(member.url)"
					>
						<Avatar :src="member.avatarUrl" :alt="member.name" size="2.5rem" circle no-shadow />
						<span class="min-w-0 flex-1 truncate font-semibold text-contrast">{{ member.name }}</span>
						<ExternalIcon v-if="member.url" class="size-4 shrink-0 text-secondary" />
					</a>
				</div>
			</section>

			<!-- 2. SLS 专属 -->
			<section class="flex flex-col gap-2">
				<h3 class="m-0 text-sm font-semibold text-contrast">Starlight 专用启动器</h3>
				<p class="m-0 text-sm text-secondary">
					该启动器为 Starlight 专用。如果您还未加入 StarLight，请前往我们的 QQ 审核群
					<button
						type="button"
						class="cursor-pointer border-0 bg-transparent p-0 font-semibold text-brand underline"
						@click="openLink(`https://qm.qq.com/q/${QQ_GROUP}`)"
					>
						{{ QQ_GROUP }}
					</button>
					。
				</p>
			</section>

			<!-- 3. 服规更新 -->
			<section class="flex flex-col gap-2">
				<h3 class="m-0 text-sm font-semibold text-contrast">StarLight 总则章程更新</h3>
				<p class="m-0 text-sm text-secondary">
					StarLight 总则章程（即“服规”）更新至第 15 版。该版服规进一步完善与严格了聚落建立、改组、招新与运营的全链条要求，请大家注意阅读并遵守！本版服规自
					2026 年 9 月 27 日 0 点起开始试行。
				</p>
				<button
					type="button"
					class="flex w-fit cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-sm font-semibold text-brand underline"
					@click="openLink(RULES_URL)"
				>
					查看服规链接
					<ExternalIcon class="size-3.5" />
				</button>
			</section>

			<!-- 4. 服务器连接 -->
			<section class="flex flex-col gap-2">
				<h3 class="m-0 text-sm font-semibold text-contrast">服务器连接</h3>
				<p class="m-0 text-sm text-secondary">服务器目前下列几项 IP 可用：</p>
				<ul class="m-0 flex flex-col gap-1 pl-5 text-sm text-secondary">
					<li v-for="ip in SERVER_IPS" :key="ip.host">
						<span class="text-contrast">{{ ip.label }}</span>
						：<code class="text-brand">{{ ip.host }}</code>
					</li>
				</ul>
				<p class="m-0 text-sm text-secondary">
					请注意，我们优先推荐您尝试直连 IP（包括 v4 和 v6，哪个可用用哪个）。若没有出现高延迟或延迟波动严重的问题，尽量避免使用代理
					IP（代理 IP 是流量计费的，使用会给服务器带来更大的经济压力）。
				</p>
				<p class="m-0 text-sm text-secondary">
					若必须使用代理 IP，按以往经验，河北（含）以北的我国省份，在选用代理 IP 时建议优先选用北方代理，否则请使用南方代理。
				</p>
			</section>
		</div>

		<template #actions>
			<div class="flex justify-end">
				<ButtonStyled color="brand">
					<button @click="hide">
						<XIcon />
						我知道了
					</button>
				</ButtonStyled>
			</div>
		</template>
	</NewModal>
</template>
