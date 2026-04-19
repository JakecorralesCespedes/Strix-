<script lang="ts">
  import { Alert, Button, Heading, TableBodyCell, TableBodyRow } from "flowbite-svelte";
  import { onMount } from "svelte";
  import DepartmentsForm from "../../components/DepartmentsForm.svelte";
  import Table from "$lib/components/Table.svelte";
  import { PlusOutline } from "flowbite-svelte-icons";
  import { getDepartment } from "$lib/services/department.service";
  import type { Department, TableHeader, TablePagination } from "$lib/types";

  let formMode: "create" | "update" = "create";
  let formOpen = false;
  let error: string | null = null;
  let departments: Department[] = [];
  let selected: Department = {
    name: "",
    code: "",
    pricingId: 0,
    headId: null,
  };
  let pagination: TablePagination = {
    page: 1,
  };

  const headers: TableHeader[] = [
    { name: "Nombre", field: "name" },
    { name: "Codigo", field: "code" },
    { name: "Precio", field: "pricing" },
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
    formMode = "create";
    selected = {
      name: "",
      code: "",
      pricingId: 0,
      headId: null,
    };
    formOpen = true;
  }

  function handleCloseForm() {
    formOpen = false;
    selected = {
      name: "",
      code: "",
      pricingId: 0,
      headId: null,
    };
    loadDepartments();
  }

  function handleEdit(row: Department) {
    formMode = "update";
    selected = {
      ...row,
      pricingId: row.pricingId ?? 1,
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
  <div class=" grid-flow-row">
    <Heading tag="h3" class="mb-4">Configuracion de Departamentos</Heading>

    <DepartmentsForm
      bind:open={formOpen}
      {formMode}
      data={selected}
      on:close={handleCloseForm}
    />
  </div>

  {#if error}
    <Alert type="error" dismissable>{error}</Alert>
  {/if}

  <Table
    data={departments}
    headers={headers}
    {pagination}
    on:next={nextPage}
    on:previous={previousPage}
  >
    <TableBodyRow slot="row" let:row>
      <TableBodyCell>{row.name}</TableBodyCell>
      <TableBodyCell>{row.code}</TableBodyCell>
      <TableBodyCell>{row.pricing ?? "-"}</TableBodyCell>
      <TableBodyCell>{row.head?.name ?? "-"}</TableBodyCell>
      <TableBodyCell>
        <Button size="xs" color="alternative" on:click={() => handleEdit(row)}>
          Editar
        </Button>
      </TableBodyCell>
    </TableBodyRow>
  </Table>

  <div class="grid-flow-row">
    <Button color="primary" size="sm" on:click={handleOpenForm}
      ><PlusOutline /> Agregar</Button
    >
  </div>
</div>
