<script lang="ts">
  import {
    Alert,
    Button,
    Heading,
    TableBodyCell,
    TableBodyRow,
  } from "flowbite-svelte";
  import { onMount } from "svelte";
  import DepartmentsForm from "../../components/DepartmentsForm.svelte";
  import Table from "$lib/components/Table.svelte";
  import { PlusOutline } from "flowbite-svelte-icons";
  import { getDepartment } from "$lib/services/department.service";
  import { hasAnyPermission } from "$lib/utils/permissions";
  import { userStore } from "../../../stores/user.store";
  import type {
    Department,
    TableHeader,
    TablePagination,
    User,
  } from "$lib/types";

  let formMode: "create" | "update" = "create";
  let formOpen = false;
  let error: string | null = null;
  let departments: Department[] = [];
  let currentUser: User | null = null;
  let selected: Department = {
    name: "",
    code: "",
    pricing: 0,
    headId: null,
  };
  let pagination: TablePagination = {
    page: 1,
  };

  userStore.subscribe((value) => {
    currentUser = value.dbUser ?? null;
  });

  $: canWrite = hasAnyPermission(currentUser, ["departments.write"]);

  const headers: TableHeader[] = [
    { name: "Nombre", field: "name" },
    { name: "Código", field: "code" },
    { name: "Precio base", field: "pricing" },
    { name: "Jefe", field: "head" },
    { name: "Acciones", field: "actions" },
  ];

  async function loadDepartments() {
    const res = await getDepartment({ page: pagination.page });

    if (!res) {
      departments = [];
      error = "No se pudieron cargar departamentos.";
      return;
    }

    departments = res.data ?? [];
    pagination.page = res.page ?? 1;
    pagination.next_page = res.next_page;
    pagination.prev_page = res.prev_page;
    error = null;
  }

  function handleOpenForm() {
    if (!canWrite) return;
    formMode = "create";
    selected = {
      name: "",
      code: "",
      pricing: 0,
      headId: null,
    };
    formOpen = true;
  }

  function handleCloseForm() {
    formOpen = false;
    selected = {
      name: "",
      code: "",
      pricing: 0,
      headId: null,
    };
    loadDepartments();
  }

  function handleEdit(row: Department) {
    if (!canWrite) return;
    formMode = "update";
    selected = {
      ...row,
      headId: row.headId ?? row.head?.id ?? null,
    };
    formOpen = true;
  }

  function nextPage() {
    pagination.page = pagination.next_page ?? pagination.page;
    loadDepartments();
  }

  function previousPage() {
    pagination.page = pagination.prev_page ?? pagination.page;
    loadDepartments();
  }

  onMount(() => {
    loadDepartments();
  });
</script>

<div class="w-full px-4 grid gap-3">
  <div class="grid-flow-row flex items-center justify-between flex-wrap gap-2">
    <Heading tag="h3" class="mb-2">Configuración de departamentos</Heading>
    {#if canWrite}
      <Button color="primary" size="sm" on:click={handleOpenForm}>
        <PlusOutline /> Agregar
      </Button>
    {/if}
  </div>

  <DepartmentsForm
    bind:open={formOpen}
    {formMode}
    data={selected}
    on:close={handleCloseForm}
  />

  {#if error}
    <Alert color="red" dismissable>{error}</Alert>
  {/if}

  <p class="text-xs text-gray-500">
    El precio base se usa cuando un departamento no tiene precios específicos
    configurados en la sección "Precios". Si el departamento tiene precios, el
    sistema usa el precio que se elija al registrar las horas.
  </p>

  <Table
    data={departments}
    {headers}
    {pagination}
    on:next={nextPage}
    on:previous={previousPage}
  >
    <TableBodyRow slot="row" let:row>
      <TableBodyCell>{row.name}</TableBodyCell>
      <TableBodyCell>{row.code}</TableBodyCell>
      <TableBodyCell
        >{row.pricing != null
          ? `₡${row.pricing.toLocaleString("es-CR")}`
          : "-"}</TableBodyCell
      >
      <TableBodyCell>{row.head?.name ?? "-"}</TableBodyCell>
      <TableBodyCell>
        {#if canWrite}
          <Button
            size="xs"
            color="alternative"
            on:click={() => handleEdit(row)}
          >
            Editar
          </Button>
        {:else}
          -
        {/if}
      </TableBodyCell>
    </TableBodyRow>
  </Table>
</div>
