<script lang="ts">
	import {
		Alert,
		Button,
		Heading,
		Input,
		Modal,
		Select,
		TableBodyCell,
		TableBodyRow,
	} from "flowbite-svelte";
	import { onMount } from "svelte";
	import Table from "$lib/components/Table.svelte";
	import { getUsers, updateUser } from "$lib/services/user.service";
	import { getRoles } from "$lib/services/role.service";
	import { getDepartment } from "$lib/services/department.service";
	import type { Department, Role, TableHeader, TablePagination, User } from "$lib/types";

	let users: User[] = [];
	let search = "";
	let error: string | null = null;
	let pagination: TablePagination = { page: 1 };
	let roleOptions: Role[] = [];
	let departmentOptions: Department[] = [];
	let editOpen = false;
	let selectedUser: User | null = null;
	let selectedRoleId: number | null = null;
	let selectedDepartmentId: number | null = null;

	const headers: TableHeader[] = [
		{ name: "Nombre", field: "name" },
		{ name: "Correo", field: "email" },
		{ name: "Telefono", field: "phone" },
		{ name: "Rol", field: "role" },
		{ name: "Departamento", field: "department" },
	];

	async function loadUsers() {
		const res = await getUsers({
			page: pagination.page,
			search: search.trim() || undefined,
		});

		if (!res) {
			users = [];
			error = "No se pudo cargar usuarios. Revisa sesion o backend.";
			return;
		}

		users = res.data ?? [];
		pagination.page = res.page ?? 1;
		pagination.next_page = res.next_page;
		pagination.prev_page = res.prev_page;
		error = null;
	}

	async function loadLookups() {
		const [rolesRes, departmentsRes] = await Promise.all([
			getRoles({ page: 1, size: 200 }),
			getDepartment({ page: 1, size: 200 }),
		]);

		roleOptions = rolesRes?.data ?? [];
		departmentOptions = departmentsRes?.data ?? [];
	}

	function handleSearchSubmit() {
		pagination.page = 1;
		loadUsers();
	}

	function nextPage() {
		pagination.page = pagination.next_page ?? pagination.page;
		loadUsers();
	}

	function previousPage() {
		pagination.page = pagination.prev_page ?? pagination.page;
		loadUsers();
	}

	function openEdit(user: User) {
		selectedUser = user;
		selectedRoleId = user.roleId ?? user.role?.id ?? null;
		selectedDepartmentId = user.departmentId ?? user.department?.id ?? null;
		editOpen = true;
	}

	async function handleSave() {
		const roleId = Number(selectedRoleId);
		const departmentId = Number(selectedDepartmentId);

		if (!selectedUser || !roleId || !departmentId) {
			error = "Debes seleccionar rol y departamento.";
			return;
		}

		const updated = await updateUser(selectedUser.id, {
			roleId,
			departmentId,
		});

		if (!updated) {
			error = "No se pudo actualizar el usuario.";
			return;
		}

		editOpen = false;
		selectedUser = null;
		selectedRoleId = null;
		selectedDepartmentId = null;
		loadUsers();
	}

	onMount(() => {
		loadUsers();
		loadLookups();
	});
</script>

<div class="w-full h-full px-4 grid gap-3">
	<Heading tag="h3" class="mb-2">Configuracion de Usuarios</Heading>

	<form on:submit|preventDefault={handleSearchSubmit} class="max-w-sm">
		<Input bind:value={search} placeholder="Buscar por nombre o correo" />
	</form>

	{#if error}
		<Alert type="error" dismissable>{error}</Alert>
	{/if}

	<Table data={users} headers={headers} {pagination} on:next={nextPage} on:previous={previousPage}>
		<TableBodyRow slot="row" let:row on:dblclick={() => openEdit(row)}>
			<TableBodyCell>{row.name}</TableBodyCell>
			<TableBodyCell>{row.email}</TableBodyCell>
			<TableBodyCell>{row.phone}</TableBodyCell>
			<TableBodyCell>{row.role?.name ?? "-"}</TableBodyCell>
			<TableBodyCell>{row.department?.name ?? "-"}</TableBodyCell>
		</TableBodyRow>
	</Table>
</div>

<Modal title="Asignar rol y departamento" bind:open={editOpen} outsideclose>
	{#if selectedUser}
		<div class="grid gap-4">
			<div>
				<p class="text-sm text-gray-500">Usuario</p>
				<p class="font-medium">{selectedUser.name} ({selectedUser.email})</p>
			</div>
			<div>
				<p class="text-sm text-gray-500">Rol</p>
				<Select bind:value={selectedRoleId}>
					<option value={""}>Selecciona un rol</option>
					{#each roleOptions as role}
						<option value={role.id}>{role.name}</option>
					{/each}
				</Select>
			</div>
			<div>
				<p class="text-sm text-gray-500">Departamento</p>
				<Select bind:value={selectedDepartmentId}>
					<option value={""}>Selecciona un departamento</option>
					{#each departmentOptions as department}
						<option value={department.id}>{department.name}</option>
					{/each}
				</Select>
			</div>
		</div>
	{/if}

	<svelte:fragment slot="footer">
		<Button color="primary" on:click={handleSave}>Guardar</Button>
		<Button color="alternative" on:click={() => (editOpen = false)}>Cerrar</Button>
	</svelte:fragment>
</Modal>
