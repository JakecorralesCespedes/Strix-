<script lang="ts">
	import {
		Alert,
		Button,
		Heading,
		Input,
		Modal,
		TableBodyCell,
		TableBodyRow,
	} from "flowbite-svelte";
	import { onMount } from "svelte";
	import Table from "$lib/components/Table.svelte";
	import { getPermissions } from "$lib/services/permission.service";
	import { createRole, getRoles, updateRole } from "$lib/services/role.service";
	import type { Role, TableHeader, TablePagination } from "$lib/types";

	let roles: Role[] = [];
	let error: string | null = null;
	let pagination: TablePagination = { page: 1 };
	let permissionOptions: string[] = [];
	let formOpen = false;
	let formMode: "create" | "update" = "create";
	let formName = "";
	let selectedPermissions: string[] = [];
	let selectedRoleId: number | null = null;

	const headers: TableHeader[] = [
		{ name: "Nombre", field: "name" },
		{ name: "Permisos", field: "allowedPermissions" },
	];

	async function loadRoles() {
		const res = await getRoles({ page: pagination.page });

		if (!res) {
			roles = [];
			error = "No se pudieron cargar roles.";
			return;
		}

		roles = res.data ?? [];
		pagination.page = res.page ?? 1;
		pagination.next_page = res.next_page;
		pagination.prev_page = res.prev_page;
		error = null;
	}

	async function loadPermissions() {
		const res = await getPermissions();
		permissionOptions = res ?? [];
	}

	function openCreate() {
		formMode = "create";
		formName = "";
		selectedPermissions = [];
		selectedRoleId = null;
		formOpen = true;
	}

	function openEdit(role: Role) {
		formMode = "update";
		selectedRoleId = role.id;
		formName = role.name ?? "";
		selectedPermissions = [...(role.allowedPermissions ?? [])];
		formOpen = true;
	}

	async function handleSave() {
		if (!formName.trim()) {
			error = "Debes indicar el nombre del rol.";
			return;
		}

		const payload = {
			name: formName.trim(),
			allowedPermissions: selectedPermissions,
		};

		if (formMode === "create") {
			const created = await createRole(payload);
			if (!created) {
				error = "No se pudo crear el rol.";
				return;
			}
		} else if (selectedRoleId) {
			const updated = await updateRole(selectedRoleId, payload);
			if (!updated) {
				error = "No se pudo actualizar el rol.";
				return;
			}
		}

		formOpen = false;
		await loadRoles();
	}

	function nextPage() {
		pagination.page = pagination.next_page ?? pagination.page;
		loadRoles();
	}

	function previousPage() {
		pagination.page = pagination.prev_page ?? pagination.page;
		loadRoles();
	}

	onMount(() => {
		loadRoles();
		loadPermissions();
	});
</script>

<div class="w-full h-full px-4 grid gap-3">
	<div class="flex items-center justify-between">
		<Heading tag="h3" class="mb-2">Configuracion de Roles</Heading>
		<Button color="primary" size="sm" on:click={openCreate}>Agregar</Button>
	</div>

	{#if error}
		<Alert type="error" dismissable>{error}</Alert>
	{/if}

	<Table data={roles} headers={headers} {pagination} on:next={nextPage} on:previous={previousPage}>
		<TableBodyRow slot="row" let:row on:dblclick={() => openEdit(row)}>
			<TableBodyCell>{row.name}</TableBodyCell>
			<TableBodyCell>{row.allowedPermissions?.length ?? 0} permisos</TableBodyCell>
		</TableBodyRow>
	</Table>
</div>

<Modal title={formMode === "create" ? "Crear rol" : "Actualizar rol"} bind:open={formOpen} outsideclose>
	<div class="grid gap-3">
		<div>
			<p class="text-sm text-gray-500">Nombre</p>
			<Input bind:value={formName} placeholder="Nombre del rol" />
		</div>
		<div>
			<p class="text-sm text-gray-500">Permisos</p>
			<div class="grid gap-2 max-h-64 overflow-y-auto border rounded p-2">
				{#if permissionOptions.length}
					{#each permissionOptions as permission}
						<label class="flex items-center gap-2 text-sm">
							<input type="checkbox" bind:group={selectedPermissions} value={permission} />
							{permission}
						</label>
					{/each}
				{:else}
					<p class="text-sm text-gray-500">No hay permisos disponibles.</p>
				{/if}
			</div>
		</div>
	</div>

	<svelte:fragment slot="footer">
		<Button color="primary" on:click={handleSave}>
			{formMode === "create" ? "Crear" : "Actualizar"}
		</Button>
		<Button color="alternative" on:click={() => (formOpen = false)}>Cerrar</Button>
	</svelte:fragment>
</Modal>
