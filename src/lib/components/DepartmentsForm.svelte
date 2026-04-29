<script lang="ts">
  import {
    Alert,
    Button,
    Input,
    Label,
    Modal,
    Select,
    Spinner,
  } from "flowbite-svelte";
  import type { Department, User } from "../types";

  import { createEventDispatcher, onMount } from "svelte";
  import { getUsers } from "../services/user.service";
  import {
    createDepartment,
    updateDepartment,
  } from "../services/department.service";

  const dispatch = createEventDispatcher();
  export let open = false;
  export let formMode: "create" | "update" = "create";
  export let data: Department = {
    name: "",
    code: "",
    pricing: 0,
    headId: null,
  };
  let userOptions: User[] = [];
  let availableHeads: User[] = [];
  let selectedHeadId: number | string | null = null;
  let headInitialized = false;
  let currentDepartmentId: number | null = null;
  let directPrice = 0;
  let isLoading = false;
  let formError: string | null = null;

  $: title =
    formMode === "create" ? "Crear departamento" : "Actualizar departamento";

  onMount(async () => {
    const usersRes = await getUsers({ page: 1, size: 200 });
    userOptions = usersRes?.data ?? [];
  });

  $: availableHeads =
    formMode === "update" && data.id
      ? userOptions.filter((user) => {
          const userDeptId = user.departmentId ?? user.department?.id;
          return userDeptId === data.id || user.id === data.headId;
        })
      : [];

  $: if (!open) {
    headInitialized = false;
    currentDepartmentId = null;
  }

  $: if (open && formMode === "update" && data.id) {
    if (data.id !== currentDepartmentId || !headInitialized) {
      currentDepartmentId = data.id;
      selectedHeadId = data.headId ?? data.head?.id ?? 0;
      directPrice = typeof data.pricing === "number" ? data.pricing : 0;
      headInitialized = true;
    }
  }

  $: if (open && formMode === "create" && !headInitialized) {
    selectedHeadId = 0;
    directPrice = 0;
    headInitialized = true;
  }

  function close() {
    dispatch("close");
    open = false;
    isLoading = false;
    formError = null;
  }

  async function handleSubmit() {
    formError = null;
    isLoading = true;
    const price = Number(directPrice);

    if (formMode === "create") {
      const res = await createDepartment({
        name: data.name,
        code: data.code,
        pricing: Number.isFinite(price) ? price : 0,
      });
      if (!res) {
        formError = "No se pudo crear el departamento.";
        isLoading = false;
        return;
      }
      close();
      return;
    }

    const headIdValue = Number(selectedHeadId);
    const headId = headIdValue > 0 ? headIdValue : null;
    const res = await updateDepartment(data.id as number, {
      name: data.name,
      code: data.code,
      pricing: Number.isFinite(price) ? price : 0,
      headId,
    });

    if (!res) {
      formError = "No se pudo actualizar el departamento.";
      isLoading = false;
      return;
    }

    close();
  }
</script>

<Modal {title} bind:open outsideclose shadow rounded class="w-[50%]">
  <form class="grid gap-3 items-center object-center">
    {#if formError}
      <Alert color="red" class="mb-3">{formError}</Alert>
    {/if}
    <Label>Nombre</Label>
    <Input bind:value={data.name} placeholder="Nombre del departamento" />
    <Label>Código</Label>
    <Input bind:value={data.code} placeholder="Código" />
    <Label>Precio base por hora (₡)</Label>
    <Input
      type="number"
      bind:value={directPrice}
      min="0"
      step="0.01"
      placeholder="0.00"
    />
    <p class="text-xs text-gray-500">
      Este precio se usa solo cuando no hay precios específicos configurados
      para el departamento. Para múltiples tarifas usa la sección de "Precios".
    </p>
    {#if formMode === "update"}
      <Label>Jefe de departamento</Label>
      <Select label="Jefe" bind:value={selectedHeadId}>
        <option value={0}>Sin jefe</option>
        {#if availableHeads.length}
          {#each availableHeads as user}
            <option value={user.id}>{user.name}</option>
          {/each}
        {:else}
          <option value={0} disabled>No hay usuarios asignados</option>
        {/if}
      </Select>
    {:else}
      <p class="text-sm text-gray-500">
        Puedes asignar el jefe después de crear el departamento.
      </p>
    {/if}
  </form>

  <svelte:fragment slot="footer">
    <Button color="primary" on:click={handleSubmit}>
      {formMode === "create" ? "Crear" : "Actualizar"}
      {#if isLoading}
        <Spinner color="white" size="sm" />
      {/if}
    </Button>
  </svelte:fragment>
</Modal>
