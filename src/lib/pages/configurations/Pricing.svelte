<script lang="ts">
	import {
		Alert,
		Badge,
		Button,
		Heading,
		Input,
		Label,
		Modal,
		TableBodyCell,
		TableBodyRow,
	} from "flowbite-svelte";
	import { onMount } from "svelte";
	import Table from "$lib/components/Table.svelte";
	import { getPricing, updatePricing } from "$lib/services/pricing.service";
	import type { Pricing, TableHeader } from "$lib/types";

	let pricingList: Pricing[] = [];
	let selected: Pricing | null = null;
	let editOpen = false;
	let error: string | null = null;

	const headers: TableHeader[] = [
		{ name: "ID", field: "id" },
		{ name: "Precio", field: "price" },
		{ name: "Estado", field: "active" },
		{ name: "Acciones", field: "actions" },
	];

	async function loadPricing() {
		const res = await getPricing();

		if (!res) {
			pricingList = [];
			error = "No se pudieron cargar precios.";
			return;
		}

		pricingList = res;
		error = null;
	}

	function openEdit(row: Pricing) {
		selected = { ...row };
		editOpen = true;
	}

	async function save() {
		if (!selected) {
			return;
		}

		const res = await updatePricing(selected);

		if (!res) {
			error = "No se pudo actualizar el precio.";
			return;
		}

		editOpen = false;
		selected = null;
		await loadPricing();
	}

	onMount(() => {
		loadPricing();
	});
</script>

<div class="w-full h-full px-4 grid gap-3">
	<Heading tag="h3" class="mb-2">Configuracion de Precios</Heading>

	{#if error}
		<Alert type="error" dismissable>{error}</Alert>
	{/if}

	<Table data={pricingList} headers={headers}>
		<TableBodyRow slot="row" let:row>
			<TableBodyCell>{row.id}</TableBodyCell>
			<TableBodyCell>{row.price}</TableBodyCell>
			<TableBodyCell>
				<Badge color={row.active ? "green" : "red"}>{row.active ? "Activo" : "Inactivo"}</Badge>
			</TableBodyCell>
			<TableBodyCell>
				<Button size="xs" color="alternative" on:click={() => openEdit(row)}>
					Editar
				</Button>
			</TableBodyCell>
		</TableBodyRow>
	</Table>
</div>

<Modal title="Editar Precio" bind:open={editOpen} outsideclose>
	{#if selected}
		<Label class="block mb-2">Precio</Label>
		<Input type="number" bind:value={selected.price} />
		<Label class="block mb-2 mt-3">Activo</Label>
		<select class="w-full border rounded-md p-2" bind:value={selected.active}>
			<option value={true}>Activo</option>
			<option value={false}>Inactivo</option>
		</select>
	{/if}

	<svelte:fragment slot="footer">
		<Button color="primary" on:click={save}>Guardar</Button>
	</svelte:fragment>
</Modal>
