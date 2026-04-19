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
  import {
    createStudent,
    getStudents,
    updateStudent,
  } from "$lib/services/student.service";
  import type { Student, TableHeader, TablePagination } from "$lib/types";

  let students: Student[] = [];
  let error: string | null = null;
  let search = "";
  let pagination: TablePagination = { page: 1 };
  let formOpen = false;
  let formMode: "create" | "update" = "create";
  let formName = "";
  let formEmail = "";
  let formPhone = "";
  let formCode = "";
  let selectedStudentId: number | null = null;

  const headers: TableHeader[] = [
    { name: "Nombre", field: "name" },
    { name: "Correo", field: "email" },
    { name: "Telefono", field: "phone" },
    { name: "Codigo", field: "code" },
    { name: "Acciones", field: "actions" },
  ];

  async function loadStudents() {
    const res = await getStudents({
      page: pagination.page,
      search: search.trim() || undefined,
    });

    if (!res) {
      students = [];
      error = "No se pudieron cargar estudiantes.";
      return;
    }

    students = res.data ?? [];
    pagination.page = res.page ?? 1;
    pagination.next_page = res.next_page;
    pagination.prev_page = res.prev_page;
    error = null;
  }

  function openCreate() {
    formMode = "create";
    formName = "";
    formEmail = "";
    formPhone = "";
    formCode = "";
    selectedStudentId = null;
    formOpen = true;
  }

  function openEdit(student: Student) {
    formMode = "update";
    selectedStudentId = student.id ?? null;
    formName = student.name ?? "";
    formEmail = student.email ?? "";
    formPhone = student.phone ?? "";
    formCode = student.code ?? "";
    formOpen = true;
  }

  async function handleSave() {
    if (!formName || !formEmail || !formPhone || !formCode) {
      error = "Completa todos los campos.";
      return;
    }

    const payload = {
      name: formName,
      email: formEmail,
      phone: formPhone,
      code: formCode,
    };

    if (formMode === "create") {
      const created = await createStudent(payload);
      if (!created) {
        error = "No se pudo crear el estudiante.";
        return;
      }
    } else if (selectedStudentId) {
      const updated = await updateStudent(selectedStudentId, payload);
      if (!updated) {
        error = "No se pudo actualizar el estudiante.";
        return;
      }
    }

    formOpen = false;
    await loadStudents();
  }

  function handleSearchSubmit() {
    pagination.page = 1;
    loadStudents();
  }

  function nextPage() {
    pagination.page = pagination.next_page ?? pagination.page;
    loadStudents();
  }

  function previousPage() {
    pagination.page = pagination.prev_page ?? pagination.page;
    loadStudents();
  }

  onMount(() => {
    loadStudents();
  });
</script>

<div class="w-full h-full px-4 grid gap-3">
  <div class="flex items-center justify-between">
    <Heading tag="h3" class="mb-2">Configuracion de Estudiantes</Heading>
    <Button color="primary" size="sm" on:click={openCreate}>Agregar</Button>
  </div>

  <form on:submit|preventDefault={handleSearchSubmit} class="max-w-sm">
    <Input bind:value={search} placeholder="Buscar por nombre, correo o codigo" />
  </form>

  {#if error}
    <Alert type="error" dismissable>{error}</Alert>
  {/if}

  <Table data={students} headers={headers} {pagination} on:next={nextPage} on:previous={previousPage}>
    <TableBodyRow slot="row" let:row>
      <TableBodyCell>{row.name}</TableBodyCell>
      <TableBodyCell>{row.email}</TableBodyCell>
      <TableBodyCell>{row.phone}</TableBodyCell>
      <TableBodyCell>{row.code}</TableBodyCell>
      <TableBodyCell>
        <Button size="xs" color="alternative" on:click={() => openEdit(row)}>
          Editar
        </Button>
      </TableBodyCell>
    </TableBodyRow>
  </Table>
</div>

<Modal title={formMode === "create" ? "Crear estudiante" : "Actualizar estudiante"} bind:open={formOpen} outsideclose>
  <div class="grid gap-3">
    <div>
      <p class="text-sm text-gray-500">Nombre</p>
      <Input bind:value={formName} placeholder="Nombre" />
    </div>
    <div>
      <p class="text-sm text-gray-500">Correo</p>
      <Input bind:value={formEmail} placeholder="correo@dominio.com" />
    </div>
    <div>
      <p class="text-sm text-gray-500">Telefono</p>
      <Input bind:value={formPhone} placeholder="809-000-0000" />
    </div>
    <div>
      <p class="text-sm text-gray-500">Codigo</p>
      <Input bind:value={formCode} placeholder="EST-0001" />
    </div>
  </div>

  <svelte:fragment slot="footer">
    <Button color="primary" on:click={handleSave}>
      {formMode === "create" ? "Crear" : "Actualizar"}
    </Button>
    <Button color="alternative" on:click={() => (formOpen = false)}>Cerrar</Button>
  </svelte:fragment>
</Modal>
