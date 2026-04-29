<script lang="ts">
  import {
    Alert,
    Badge,
    Button,
    Heading,
    Input,
    Label,
    Modal,
    Select,
    Toggle,
  } from "flowbite-svelte";
  import { onMount } from "svelte";
  import {
    createDepartmentPrice,
    deleteDepartmentPrice,
    getDepartmentPrices,
    updateDepartmentPrice,
    type DepartmentPrice,
  } from "$lib/services/department-prices.service";
  import { getDepartment } from "$lib/services/department.service";
  import type { Department, User } from "$lib/types";
  import { hasAnyPermission } from "$lib/utils/permissions";
  import { userStore } from "../../../stores/user.store";

  let departments: Department[] = [];
  let prices: DepartmentPrice[] = [];
  let loading = false;
  let error: string | null = null;
  let success: string | null = null;

  let formOpen = false;
  let formMode: "create" | "update" = "create";
  let formId: number | null = null;
  let formDepartmentId: number | null = null;
  let formLabel = "";
  let formPrice = 0;
  let formActive = true;

  let confirmOpen = false;
  let confirmId: number | null = null;

  let currentUser: User | null = null;

  userStore.subscribe((value) => {
    currentUser = value.dbUser ?? null;
  });

  $: canWrite = hasAnyPermission(currentUser, ["pricing.write"]);

  async function loadDepartments() {
    const res = await getDepartment({ page: 1, size: 200 });
    departments = res?.data ?? [];
  }

  async function loadPrices() {
    loading = true;
    prices = await getDepartmentPrices();
    loading = false;
  }

  function getDepartmentName(id: number) {
    return departments.find((d) => d.id === id)?.name ?? `Dept #${id}`;
  }

  function openCreate(deptId?: number) {
    formMode = "create";
    formId = null;
    formDepartmentId = deptId ?? departments[0]?.id ?? null;
    formLabel = "";
    formPrice = 0;
    formActive = true;
    error = null;
    success = null;
    formOpen = true;
  }

  function openEdit(price: DepartmentPrice) {
    formMode = "update";
    formId = price.id;
    formDepartmentId = price.departmentId;
    formLabel = price.label;
    formPrice = price.price;
    formActive = price.active;
    error = null;
    success = null;
    formOpen = true;
  }

  async function handleSave() {
    if (!formDepartmentId) {
      error = "Selecciona un departamento.";
      return;
    }
    if (!formLabel.trim()) {
      error = "Escribe una etiqueta para el precio (ej: Tutor básico).";
      return;
    }
    const numericPrice = Number(formPrice);
    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      error = "El precio debe ser un número mayor o igual a 0.";
      return;
    }

    if (formMode === "create") {
      const created = await createDepartmentPrice({
        departmentId: Number(formDepartmentId),
        label: formLabel.trim(),
        price: numericPrice,
        active: formActive,
      });
      if (!created) {
        error = "No se pudo crear el precio.";
        return;
      }
      success = "Precio creado.";
    } else if (formId) {
      const updated = await updateDepartmentPrice(formId, {
        departmentId: Number(formDepartmentId),
        label: formLabel.trim(),
        price: numericPrice,
        active: formActive,
      });
      if (!updated) {
        error = "No se pudo actualizar el precio.";
        return;
      }
      success = "Precio actualizado.";
    }

    formOpen = false;
    await loadPrices();
  }

  function askDelete(id: number) {
    confirmId = id;
    confirmOpen = true;
  }

  async function confirmDelete() {
    if (!confirmId) return;
    const ok = await deleteDepartmentPrice(confirmId);
    confirmOpen = false;
    if (!ok) {
      error = "No se pudo eliminar el precio.";
      return;
    }
    success = "Precio eliminado.";
    confirmId = null;
    await loadPrices();
  }

  $: pricesByDepartment = departments.map((dept) => ({
    department: dept,
    items: prices.filter((p) => p.departmentId === dept.id),
  }));

  onMount(async () => {
    await loadDepartments();
    await loadPrices();
  });
</script>

<div class="w-full h-full px-4 grid gap-3">
  <div
    class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
  >
    <div>
      <Heading tag="h3" class="mb-1">Precios por departamento</Heading>
      <p class="text-sm text-gray-500">
        Cada departamento puede tener varios precios (por ejemplo según el tipo
        de tarea o el nivel del estudiante). Al registrar horas se elige cuál
        precio aplica.
      </p>
    </div>
    {#if canWrite}
      <Button color="primary" size="sm" on:click={() => openCreate()}>
        + Agregar precio
      </Button>
    {/if}
  </div>

  {#if error}
    <Alert color="red" dismissable>{error}</Alert>
  {/if}
  {#if success}
    <Alert color="green" dismissable>{success}</Alert>
  {/if}

  {#if loading}
    <p class="text-sm text-gray-500">Cargando...</p>
  {:else if !departments.length}
    <p class="text-sm text-gray-500">No tienes departamentos disponibles.</p>
  {:else}
    {#each pricesByDepartment as group}
      <div class="border rounded-lg p-3 bg-white grid gap-2">
        <div class="flex items-center justify-between gap-2">
          <div>
            <p class="font-semibold">{group.department.name}</p>
            <p class="text-xs text-gray-500">
              Código: {group.department.code} · Precios activos:
              {group.items.filter((p) => p.active).length}
            </p>
          </div>
          {#if canWrite}
            <Button
              size="xs"
              color="alternative"
              on:click={() => openCreate(group.department.id)}
            >
              + Precio
            </Button>
          {/if}
        </div>

        {#if group.items.length === 0}
          <p class="text-xs text-gray-400">
            Aún no hay precios para este departamento. Mientras tanto se usará
            el precio base ({group.department.pricing ?? 0}).
          </p>
        {:else}
          <div class="grid gap-2">
            {#each group.items as price}
              <div
                class="flex flex-wrap items-center justify-between gap-3 border rounded p-2 bg-gray-50"
              >
                <div class="flex flex-col">
                  <span class="font-medium text-sm">{price.label}</span>
                  <span class="text-xs text-gray-500">
                    ₡{price.price.toLocaleString("es-CR")} por hora
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  <Badge color={price.active ? "green" : "dark"}>
                    {price.active ? "Activo" : "Inactivo"}
                  </Badge>
                  {#if canWrite}
                    <Button
                      size="xs"
                      color="alternative"
                      on:click={() => openEdit(price)}
                    >
                      Editar
                    </Button>
                    <Button
                      size="xs"
                      color="red"
                      on:click={() => askDelete(price.id)}
                    >
                      Eliminar
                    </Button>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  {/if}
</div>

<Modal
  title={formMode === "create" ? "Nuevo precio" : "Editar precio"}
  bind:open={formOpen}
  outsideclose
>
  <div class="grid gap-3">
    <div>
      <Label class="mb-1">Departamento</Label>
      <Select bind:value={formDepartmentId}>
        <option value={""}>Selecciona un departamento</option>
        {#each departments as dept}
          <option value={dept.id}>{dept.name}</option>
        {/each}
      </Select>
    </div>
    <div>
      <Label class="mb-1">Etiqueta</Label>
      <Input
        bind:value={formLabel}
        placeholder="Ej: Tutor básico, Tutor avanzado, Laboratorio..."
      />
    </div>
    <div>
      <Label class="mb-1">Precio por hora (₡)</Label>
      <Input type="number" bind:value={formPrice} min="0" step="0.01" />
    </div>
    <div class="flex items-center gap-2">
      <Toggle bind:checked={formActive} />
      <span class="text-sm text-gray-700"
        >Activo (disponible al registrar horas)</span
      >
    </div>
  </div>

  <svelte:fragment slot="footer">
    <Button color="primary" on:click={handleSave}>
      {formMode === "create" ? "Crear" : "Guardar"}
    </Button>
    <Button color="alternative" on:click={() => (formOpen = false)}>
      Cerrar
    </Button>
  </svelte:fragment>
</Modal>

<Modal title="Eliminar precio" bind:open={confirmOpen} outsideclose size="xs">
  <p class="text-sm text-gray-700">
    ¿Seguro que deseas eliminar este precio? Las horas registradas con este
    precio mantendrán el monto que tenían en ese momento.
  </p>
  <svelte:fragment slot="footer">
    <Button color="red" on:click={confirmDelete}>Eliminar</Button>
    <Button color="alternative" on:click={() => (confirmOpen = false)}>
      Cancelar
    </Button>
  </svelte:fragment>
</Modal>
