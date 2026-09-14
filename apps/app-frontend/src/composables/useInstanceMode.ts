import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type MaybeRefOrGetter, toValue } from 'vue'

import { getInstanceMode, type InstanceMode, setInstanceMode } from '@/helpers/hosted-packs'

export const instanceModeKey = (instanceId: string) => ['instance-mode', instanceId] as const

export function useInstanceMode(instanceId: MaybeRefOrGetter<string>) {
	return useQuery({
		queryKey: computed(() => instanceModeKey(toValue(instanceId))),
		queryFn: () => getInstanceMode(toValue(instanceId)),
		enabled: computed(() => !!toValue(instanceId)),
		staleTime: 30_000,
	})
}

export function useSetInstanceMode() {
	const client = useQueryClient()
	return useMutation({
		mutationFn: ({ instanceId, mode }: { instanceId: string; mode: InstanceMode }) =>
			setInstanceMode(instanceId, mode),
		onMutate: ({ instanceId }) => client.cancelQueries({ queryKey: instanceModeKey(instanceId) }),
		onSuccess: (_, { instanceId, mode }) => client.setQueryData(instanceModeKey(instanceId), mode),
		onError: (_, { instanceId }) =>
			client.invalidateQueries({ queryKey: instanceModeKey(instanceId) }),
	})
}
