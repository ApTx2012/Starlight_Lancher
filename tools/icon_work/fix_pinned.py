
p = r"D:\Project\Starlight_Lancher\apps\app-frontend\src\components\home\HomePinnedServers.vue"
t = open(p, encoding="utf-8").read()

# 1) servers computed 简化为"只返回收藏服务器"
old_servers = """const servers = computed(() => {
	const favoriteServers = favoriteWorlds.value.flatMap((world) => {
		if (world.type !== 'server' || world.address === PROTECTED_SERVER_ADDRESS) return []
		const instance = instanceById.value.get(world.instance_id)
		return instance ? [{ instance, world: world as ServerWorld & WorldWithInstance }] : []
	})
	const protectedInstance =
		props.instances.find((instance) => instance.install_stage === 'installed') ?? props.instances[0]
	if (!protectedInstance) return favoriteServers

	const protectedServer: ServerWorld & WorldWithInstance = {
		instance_id: protectedInstance.id,
		name: formatMessage(messages.protectedServerName),
		last_played: undefined,
		icon: undefined,
		display_status: 'favorite',
		type: 'server',
		index: -1,
		address: PROTECTED_SERVER_ADDRESS,
		pack_status: 'prompt',
	}
	return [{ instance: protectedInstance, world: protectedServer }, ...favoriteServers]
})"""
new_servers = """const servers = computed(() =>
	favoriteWorlds.value.flatMap((world) => {
		if (world.type !== 'server') return []
		const instance = instanceById.value.get(world.instance_id)
		return instance ? [{ instance, world: world as ServerWorld & WorldWithInstance }] : []
	}),
)"""
assert old_servers in t, "servers computed 找不到"
t = t.replace(old_servers, new_servers, 1)

# 2) 删 protectedServerName message
old_msg = """	protectedServerName: {
		id: 'app.home.servers.protected-name',
		defaultMessage: 'Starlight Server',
	},
"""
assert old_msg in t, "protectedServerName message 找不到"
t = t.replace(old_msg, "", 1)

# 3) import 去掉 PROTECTED_SERVER_ADDRESS
t = t.replace("\tPROTECTED_SERVER_ADDRESS,\n", "", 1)

# 4) 模板：去掉 v-if（让所有服务器都能取消固定）
t = t.replace(
    """					<ButtonStyled
						v-if="server.world.address !== PROTECTED_SERVER_ADDRESS"
						circular
						size="small"
						type="transparent"
						class="home-server-menu"
					>""",
    """					<ButtonStyled
						circular
						size="small"
						type="transparent"
						class="home-server-menu"
					>""",
    1,
)

open(p, "w", encoding="utf-8", newline="\n").write(t)
print("HomePinnedServers done")
print("  残留 PROTECTED:", "PROTECTED" in t)
print("  残留 protectedServerName:", "protectedServerName" in t)
