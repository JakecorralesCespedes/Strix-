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
	let departmentAssignments: Array<{
		departmentId: number | null;
		roleId: number | null;
	}> = [];
	let activeDepartmentId: number | null = null;

	const headers: TableHeader[] = [
		{ name: "Nombre", field: "name" },
		{ name: "Correo", field: "email" },
		{ name: "Telefono", field: "phone" },
		{ name: "Rol", field: "role" },
		{ name: "Departamento", field: "department" },
		{ name: "Acciones", field: "actions" },
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
		departmentAssignments = (user.departmentRoles?.length
			? user.departmentRoles.map((item) => ({
					departmentId: item.departmentId,
					roleId: item.roleId,
				}))
			: [
					{
						departmentId: user.departmentId ?? null,
						roleId: user.roleId ?? null,
					},
				]
		).filter((item) => item.departmentId || item.roleId);
		if (!departmentAssignments.length) {
			departmentAssignments = [{ departmentId: null, roleId: null }];
		}
		activeDepartmentId =
			user.departmentId ?? departmentAssignments[0]?.departmentId ?? null;
		editOpen = true;
	}

	function addAssignment() {
		departmentAssignments = [
			...departmentAssignments,
			{ departmentId: null, roleId: null },
		];
	}

	function removeAssignment(index: number) {
		departmentAssignments = departmentAssignments.filter(
			(_, idx) => idx !== index,
		);
		if (!departmentAssignments.length) {
			departmentAssignments = [{ departmentId: null, roleId: null }];
		}
		if (
			activeDepartmentId &&
			!departmentAssignments.some(
				(item) => item.departmentId === activeDepartmentId,
			)
		) {
			activeDepartmentId = departmentAssignments[0]?.departmentId ?? null;
		}
	}

	async function handleSave() {
		if (!selectedUser) {
			return;
		}

		const assignments = departmentAssignments
			.filter((item) => item.departmentId && item.roleId)
			.map((item) => ({
				departmentId: Number(item.departmentId),
				roleId: Number(item.roleId),
			}));

		if (!assignments.length) {
			error = "Debes agregar al menos un departamento con rol.";
			return;
		}

		const nextActiveDepartmentId = Number(
			activeDepartmentId ?? assignments[0]?.departmentId,
		);

		const updated = await updateUser(selectedUser.id, {
			departmentRoles: assignments,
			activeDepartmentId: nextActiveDepartmentId,
		});

		if (!updated) {
			error = "No se pudo actualizar el usuario.";
			return;
		}

		editOpen = false;
		selectedUser = null;
		departmentAssignments = [];
		activeDepartmentId = null;
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
		<TableBodyRow slot="row" let:row>
			<TableBodyCell>{row.name}</TableBodyCell>
			<TableBodyCell>{row.email}</TableBodyCell>
			<TableBodyCell>{row.phone}</TableBodyCell>
			<TableBodyCell>{row.role?.name ?? "-"}</TableBodyCell>
			<TableBodyCell>{row.department?.name ?? "-"}</TableBodyCell>
			<TableBodyCell>
				<Button size="xs" color="alternative" on:click={() => openEdit(row)}>
					Editar
				</Button>
			</TableBodyCell>
		</TableBodyRow>
	</Table>
</div>


<Modal title="Asignar roles por departamento" bind:open={editOpen} outsideclose>
	{#if selectedUser}
		<div class="grid gap-4">
			<div>
				<p class="text-sm text-gray-500">Usuario</p>
				<p class="font-medium">{selectedUser.name} ({selectedUser.email})</p>
			</div>
			<div>
				<p class="text-sm text-gray-500">Departamento activo</p>
				<Select bind:value={activeDepartmentId}>
					<option value={""}>Selecciona un departamento</option>
					{#each departmentAssignments as assignment}
						{#if assignment.departmentId}
							<option value={assignment.departmentId}>
								{departmentOptions.find(
									(department) =>
										department.id === Number(assignment.departmentId),
									)?.name ?? `Departamento ${assignment.departmentId}`}
							</option>
						{/if}
					{/each}
				</Select>
			</div>
			<div class="grid gap-3">
				{#each departmentAssignments as assignment, index}
					<div class="grid gap-2 md:grid-cols-[1fr_1fr_auto] items-end">
						<div>
							<p class="text-sm text-gray-500">Departamento</p>
							<Select bind:value={assignment.departmentId}>
								<option value={""}>Selecciona un departamento</option>
								{#each departmentOptions as department}
									<option value={department.id}>{department.name}</option>
								{/each}
							</Select>
						</div>
						<div>
							<p class="text-sm text-gray-500">Rol</p>
							<Select bind:value={assignment.roleId}>
								<option value={""}>Selecciona un rol</option>
								{#each roleOptions as role}
									<option value={role.id}>{role.name}</option>
								{/each}
							</Select>
						</div>
						<div>
							<Button
								size="xs"
								color="alternative"
								on:click={() => removeAssignment(index)}
							>
								Quitar
							</Button>
						</div>
					</div>
				{/each}
				<Button size="sm" color="primary" on:click={addAssignment}
					>Agregar departamento</Button
				>
			</div>
		</div>
	{/if}

	<svelte:fragment slot="footer">
		<Button color="primary" on:click={handleSave}>Guardar</Button>
		<Button color="alternative" on:click={() => (editOpen = false)}>Cerrar</Button>
	</svelte:fragment>
</Modal>
