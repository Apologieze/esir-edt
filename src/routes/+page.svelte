<script lang="ts">
	import BatimentCard from "$lib/BatimentCard.svelte";
	import Header from "$lib/Header.svelte";
	let { data } = $props();
	let date = $state(new Date());

	setInterval(() => {
		date = new Date();
	}, 1000 * 60);
</script>

<div class="p-4 items-center flex flex-col gap-8 h-full *:w-full *:max-w-xl">
	<Header>Salles Libres</Header>

	{#if data.stats.total > 0 && data.stats.loaded === 0}
		<div class="rounded-xl border border-yellow-500/50 bg-yellow-500/20 p-4 text-center">
			⚠️ Plannings ADE temporairement indisponibles : les salles s'affichent
			sans leur statut ({data.stats.failed}/{data.stats.total} en échec).
		</div>
	{/if}

	{#each Object.entries(data.retour).toSorted() as [university, batiments]}
		{#each Object.entries(batiments).toSorted() as [batiment, salles]}
			<BatimentCard {batiment} {salles} {date}></BatimentCard>
		{/each}
	{/each}
</div>
