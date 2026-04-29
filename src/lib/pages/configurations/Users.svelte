<script lang="ts">
  import {
    Alert,
    Button,
    Heading,
    Input,
    Label,
    Modal,
    Select,
    TableBodyCell,
    TableBodyRow,
  } from "flowbite-svelte";
  import { onMount } from "svelte";
  import Table from "$lib/components/Table.svelte";
  import { createUser, getUsers, updateUser } from "$lib/services/user.service";
  import { getRoles } from "$lib/services/role.service";
  import { getDepartment } from "$lib/services/department.service";
  import { hasAnyPermission } from "$lib/utils/permissions";
  import { userStore } from "$stores/user.store";
  import type {
    Department,
    Role,
    TableHeader,
    TablePagination,
    User,
  } from "$lib/types";

  let users: User[] = [];
  let search = "";
  let error: string | null = null;
  let success: string | null = null;
  let pagination: TablePagination = { page: 1 };
  let roleOptions: Role[] = [];
  let departmentOptions: Department[] = [];
  let editOpen = false;
  let createOpen = false;
  let selectedUser: User | null = null;
  let departmentAssignments: Array<{
    departmentId: number | null;
    roleId: number | null;
  }> = [];
  let activeDepartmentId: number | null = null;
  let editPassword = "";

  let createName = "";
  let createEmail = "";
  let createPhone = "";
  let createPassword = "";
  let createAssignments: Array<{
    departmentId: number | null;
    roleId: number | null;
  }> = [{ departmentId: null, roleId: null }];
  let createActiveDepartmentId: number | null = null;
  let saving = false;

  let currentUser: User | null = null;
  let canWrite = false;

  userStore.subscribe((value) => {
    currentUser = value.dbUser ?? null;
  });

  $: canWrite = hasAnyPermission(currentUser, ["users.write"]);

  const headers: TableHeader[] = [
    { name: "Nombre", field: "name" },
    { name: "Correo", field: "email" },
    { name: "Teléfono", field: "phone" },
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
      error =
        "No se pudieron cargar los usuarios. Revisa la sesión o el backend.";
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
    editPassword = "";
    departmentAssignments = (
      user.departmentRoles?.length
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
    error = null;
    success = null;
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

    const payload: Record<string, unknown> = {
      departmentRoles: assignments,
      activeDepartmentId: nextActiveDepartmentId,
    };

    if (editPassword.trim()) {
      if (editPassword.trim().length < 6) {
        error = "La contraseña debe tener al menos 6 caracteres.";
        return;
      }
      payload.password = editPassword.trim();
    }

    const updated = await updateUser(selectedUser.id, payload);

    if (!updated) {
      error = "No se pudo actualizar el usuario.";
      return;
    }

    editOpen = false;
    selectedUser = null;
    editPassword = "";
    departmentAssignments = [];
    activeDepartmentId = null;
    success = "Usuario actualizado correctamente.";
    await loadUsers();
  }

  function openCreate() {
    createName = "";
    createEmail = "";
    createPhone = "";
    createPassword = "";
    createAssignments = [{ departmentId: null, roleId: null }];
    createActiveDepartmentId = null;
    error = null;
    success = null;
    createOpen = true;
  }

  function addCreateAssignment() {
    createAssignments = [
      ...createAssignments,
      { departmentId: null, roleId: null },
    ];
  }

  function removeCreateAssignment(index: number) {
    createAssignments = createAssignments.filter((_, idx) => idx !== index);
    if (!createAssignments.length) {
      createAssignments = [{ departmentId: null, roleId: null }];
    }
    if (
      createActiveDepartmentId &&
      !createAssignments.some(
        (item) => item.departmentId === createActiveDepartmentId,
      )
    ) {
      createActiveDepartmentId = createAssignments[0]?.departmentId ?? null;
    }
  }

  async function handleCreate() {
    if (!createName.trim() || !createEmail.trim() || !createPassword.trim()) {
      error = "Completa nombre, correo y contraseña.";
      return;
    }
    if (createPassword.trim().length < 6) {
      error = "La contraseña debe tener al menos 6 caracteres.";
      return;
    }

    const assignments = createAssignments
      .filter((item) => item.departmentId && item.roleId)
      .map((item) => ({
        departmentId: Number(item.departmentId),
        roleId: Number(item.roleId),
      }));

    if (!assignments.length) {
      error = "Asigna al menos un departamento con su rol correspondiente.";
      return;
    }

    const nextActiveDepartmentId = Number(
      createActiveDepartmentId ?? assignments[0]?.departmentId,
    );

    saving = true;
    const created = await createUser({
      name: createName.trim(),
      email: createEmail.trim(),
      phone: createPhone.trim() || "",
      password: createPassword.trim(),
      departmentRoles: assignments,
      activeDepartmentId: nextActiveDepartmentId,
      departmentId: nextActiveDepartmentId,
      roleId: assignments[0]?.roleId,
    });
    saving = false;

    if (!created) {
      error =
        "No se pudo crear el usuario. Verifica que el correo no esté repetido.";
      return;
    }

    createOpen = false;
    success = `Usuario ${createName.trim()} creado. Le enviamos un correo con sus datos de acceso si el servicio SMTP está activo.`;
    loadUsers();
  }

  onMount(() => {
    loadUsers();
    loadLookups();
  });
</script>

<div class="w-full h-full px-4 grid gap-3">
  <div
    class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
  >
    <Heading tag="h3" class="mb-0">Configuración de usuarios</Heading>
    {#if canWrite}
      <Button size="sm" color="primary" on:click={openCreate}>
        + Crear usuario
      </Button>
    {/if}
  </div>

  <p class="text-xs text-gray-500">
    Desde aquí el administrador crea usuarios y les asigna contraseña y roles.
    Para asistentes de departamento usa el rol <strong
      >Asistente de Departamento</strong
    >; los permisos disponibles dependen del rol escogido.
  </p>

  <form on:submit|preventDefault={handleSearchSubmit} class="max-w-sm">
    <Input bind:value={search} placeholder="Buscar por nombre o correo" />
  </form>

  {#if error}
    <Alert color="red" dismissable>{error}</Alert>
  {/if}
  {#if success}
    <Alert color="green" dismissable>{success}</Alert>
  {/if}

  <Table
    data={users}
    {headers}
    {pagination}
    on:next={nextPage}
    on:previous={previousPage}
  >
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
        <Label class="mb-1">Nueva contraseña (opcional)</Label>
        <Input
          type="password"
          bind:value={editPassword}
          placeholder="Dejar en blanco para no cambiar"
        />
        <p class="text-xs text-gray-400 mt-1">
          Mínimo 6 caracteres. Solo se actualiza si escribes algo aquí.
        </p>
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
    <Button color="alternative" on:click={() => (editOpen = false)}
      >Cerrar</Button
    >
  </svelte:fragment>
</Modal>

<Modal title="Crear usuario" bind:open={createOpen} outsideclose size="md">
  <div class="grid gap-3">
    <p class="text-xs text-gray-500">
      El usuario quedará listo para iniciar sesión con el correo y la contraseña
      que indiques. Asigna un rol por departamento segun lo que pueda hacer.
    </p>

    <div class="grid sm:grid-cols-2 gap-3">
      <div>
        <Label class="mb-1">Nombre completo</Label>
        <Input bind:value={createName} placeholder="Ej: Juan Pérez" />
      </div>
      <div>
        <Label class="mb-1">Teléfono</Label>
        <Input bind:value={createPhone} placeholder="+507 6000-0000" />
      </div>
      <div>
        <Label class="mb-1">Correo electrónico</Label>
        <Input
          type="email"
          bind:value={createEmail}
          placeholder="usuario@universidad.edu"
        />
      </div>
      <div>
        <Label class="mb-1">Contrasena inicial</Label>
        <Input
          type="password"
          bind:value={createPassword}
          placeholder="Mínimo 6 caracteres"
        />
      </div>
    </div>

    <div class="grid gap-3">
      <div>
        <Label class="mb-1"
          >Departamento activo (con el que ingresa al iniciar sesión)</Label
        >
        <Select bind:value={createActiveDepartmentId}>
          <option value={""}>Selecciona un departamento</option>
          {#each createAssignments as assignment}
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

      {#each createAssignments as assignment, index}
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
              on:click={() => removeCreateAssignment(index)}
            >
              Quitar
            </Button>
          </div>
        </div>
      {/each}
      <Button size="sm" color="primary" on:click={addCreateAssignment}>
        Agregar departamento
      </Button>
    </div>
  </div>

  <svelte:fragment slot="footer">
    <Button color="primary" on:click={handleCreate} disabled={saving}>
      {saving ? "Creando..." : "Crear usuario"}
    </Button>
    <Button color="alternative" on:click={() => (createOpen = false)}>
      Cerrar
    </Button>
  </svelte:fragment>
</Modal>
