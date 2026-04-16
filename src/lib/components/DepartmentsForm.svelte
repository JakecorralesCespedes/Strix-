<script lang="ts">
  import {
    Button,
    Input,
    Label,
    Modal,
    Select,
    Spinner,
  } from "flowbite-svelte";
  import type { Department, Pricing, User } from "../types";

  import { createEventDispatcher, onMount } from "svelte";
  import { getPricing } from "../services/pricing.service";
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
    pricingId: 0,
    headId: null,
  };
  let pricingList: Array<Pricing> | undefined = [];
  let userOptions: User[] = [];
  let availableHeads: User[] = [];
  let selectedHeadId: number | string | null = null;
  let isLoading = false;

  $: title = formMode === "create"
    ? "Crear Departamento"
    : "Actualizar Departamento";

  onMount(async () => {
    const [pricingRes, usersRes] = await Promise.all([
      getPricing(),
      getUsers({ page: 1, size: 200 }),
    ]);
    pricingList = pricingRes ?? [];
    userOptions = usersRes?.data ?? [];
  });

  $: availableHeads =
    formMode === "update" && data.id
      ? userOptions.filter((user) => user.departmentId === data.id)
      : [];

  $: if (formMode === "update") {
    selectedHeadId = data.headId ?? 0;
  } else {
    selectedHeadId = 0;
  }
  function close() {
    dispatch("close");
    open = false;
    isLoading = false;
  }
  function handleSubmit() {
    isLoading = true;
    if (formMode === "create") {
      createDepartment({
        name: data.name,
        code: data.code,
        pricingId: data.pricingId,
      }).then((res) => {
        close();
      });
      // create
    } else {
      const headIdValue = Number(selectedHeadId);
      const headId = headIdValue > 0 ? headIdValue : null;
      // update
      updateDepartment(data.id as number, {
        name: data.name,
        code: data.code,
        pricingId: data.pricingId,
        headId,
      }).then((res) => {
        if (res) {
          close();
        }
      });
    }
  }
</script>

<Modal {title} bind:open outsideclose shadow rounded class="w-[50%]">
  <form class="items-center object-center">
    <Label>Nombre</Label>
    <Input bind:value={data.name} placeholder="Nombre" />
    <Label>Codigo</Label>
    <Input bind:value={data.code} placeholder="Codigo" />
    <Label>Precio</Label>
    <Select label="Precio" bind:value={data.pricingId}>
      {#if pricingList}
        {#each pricingList as pricing}
          <option value={pricing.id}>{pricing.price}</option>
        {/each}
      {:else}
        <option value={0}>Cargando...</option>
      {/if}
    </Select>
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
        Puedes asignar el jefe despues de crear el departamento.
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
