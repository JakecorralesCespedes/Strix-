<script lang="ts">
  import {
    Alert,
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
  import { getDepartment, updateDepartment } from "$lib/services/department.service";
  import type { Department, TableHeader } from "$lib/types";

  let departments: Department[] = [];
  let selected: Department | null = null;
  let editPrice = 0;
  let editOpen = false;
  let error: string | null = null;
  let success: string | null = null;

  const headers: TableHeader[] = [
    { name: "Departamento", field: "name" },
    { name: "Código", field: "code" },
    { name: "Precio por hora (RD$)", field: "pricing" },
    { name: "Acciones", field: "actions" },
  ];

  async function loadDepartments() {
    const res = await getDepartment({ page: 1, size: 200 });

    if (!res) {
      departments = [];
      error = "No se pudieron cargar los departamentos.";
      return;
    }

    departments = res.data ?? [];
    error = null;
  }

  function openEdit(dept: Department) {
    selected = dept;
    editPrice = typeof dept.pricing === "number" ? dept.pricing : 0;
    editOpen = true;
  }

  async function save() {
    if (!selected?.id) return;

    const res = await updateDepartment(selected.id, {
      name: selected.name,
      code: selected.code,
      pricing: Number(editPrice),
    });

    if (!res) {
      error = "No se pudo actualizar el precio.";
      return;
    }

    success = `Precio actualizado para ${selected.name}.`;
    editOpen = false;
    selected = null;
    await loadDepartments();
  }

  onMount(() => {
    loadDepartments();
  });
</script>

<div class="w-full h-full px-4 grid gap-3">
  <Heading tag="h3" class="mb-2">Precios por Departamento</Heading>
  <p class="text-sm text-gray-500">
    Cada departamento maneja su propio precio por hora de beca. El precio se
    aplica automáticamente al registrar horas.
  </p>

  {#if error}
    <Alert type="error" dismissable>{error}</Alert>
  {/if}
  {#if success}
    <Alert type="success" dismissable>{success}</Alert>
  {/if}

  <Table data={departments} {headers}>
    <TableBodyRow slot="row" let:row>
      <TableBodyCell>{row.name}</TableBodyCell>
      <TableBodyCell>{row.code}</TableBodyCell>
      <TableBodyCell>
        {typeof row.pricing === "number"
          ? `RD$ ${row.pricing.toLocaleString("es-DO")}`
          : "-"}
      </TableBodyCell>
      <TableBodyCell>
        <Button size="xs" color="alternative" on:click={() => openEdit(row)}>
          Editar precio
        </Button>
      </TableBodyCell>
    </TableBodyRow>
  </Table>
</div>

<Modal title="Editar precio del departamento" bind:open={editOpen} outsideclose>
  {#if selected}
    <p class="text-sm text-gray-500 mb-3">
      Departamento: <span class="font-semibold">{selected.name}</span>
    </p>
    <Label class="block mb-1">Precio por hora (RD$)</Label>
    <Input type="number" bind:value={editPrice} min="0" step="0.01" />
  {/if}

  <svelte:fragment slot="footer">
    <Button color="primary" on:click={save}>Guardar</Button>
    <Button color="alternative" on:click={() => (editOpen = false)}>Cancelar</Button>
  </svelte:fragment>
</Modal>
