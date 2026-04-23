<script lang="ts">
  import {
    Alert,
    Badge,
    Button,
    Heading,
    TableBodyCell,
    TableBodyRow,
  } from "flowbite-svelte";
  import { PlusOutline } from "flowbite-svelte-icons";
  import { onMount } from "svelte";
  import { getConfig, updateConfig, getSmtpStatus } from "../../services/config.service";
  import type { SmtpStatus } from "../../services/config.service";
  import GeneralConfigForm from "../../components/GeneralConfigForm.svelte";
  import type {
    GlobalSetting,
    MailingList,
    TableHeader,
    TablePagination,
  } from "../../types";
  import Table from "../../components/Table.svelte";
  import { getMailingList } from "../../services/mailing-list.service";
  import MailinglistForm from "../../components/MailinglistForm.svelte";

  let globalSetting: GlobalSetting | null = null;
  let mailingList: MailingList[] = [];
  let smtpStatus: SmtpStatus | null = null;

  let error: string | null = null;
  let success: string | null = null;
  let isLoading = false;
  let openModal = false;
  let modalMode: "create" | "update" = "create";

  let defaultMailList: MailingList = {
    email: "",
    name: "",
    active: true,
  };
  let currentSelected: MailingList = defaultMailList;
  $: pagination = {
    page: 1,
  } as TablePagination;

  const tableHeaders: TableHeader[] = [
    { name: "Email", field: "email" },
    { name: "Nombre", field: "name" },
    { name: "Estado", field: "state" },
    { name: "Acciones", field: "actions" },
  ];

  async function reloadConfig() {
    isLoading = true;

    try {
      const res = await getConfig();
      globalSetting = res ?? null;

      if (!res) {
        error =
          "No se pudo cargar la configuracion. Revisa login o backend activo.";
      }
    } catch (err) {
      error = "Error cargando configuracion";
      globalSetting = null;
    } finally {
      isLoading = false;
    }
  }

  async function reloadMailingList() {
    try {
      const res = await getMailingList({
        page: pagination.page,
      });

      mailingList = res?.data ?? [];
      pagination.page = res?.page ?? 1;
      pagination.next_page = res?.next_page;
      pagination.prev_page = res?.prev_page;

      if (!res) {
        error =
          "No se pudo cargar el mailing list. Revisa login o backend activo.";
      }
    } catch (err) {
      error = "Error cargando mailing list";
      mailingList = [];
    }
  }

  async function reloadSmtpStatus() {
    smtpStatus = await getSmtpStatus();
  }

  onMount(async () => {
    reloadConfig();
    reloadMailingList();
    reloadSmtpStatus();
  });

  function handleUpdate(e: CustomEvent<GlobalSetting>) {
    isLoading = true;
    updateConfig(e.detail)
      .then(() => {
        reloadConfig();
      })
      .then(() => {
        error = null;
        success = "Configuracion actualizada";
      })
      .catch((err) => {
        error = err.message;
      });
    isLoading = false;
  }
  function handleNext() {
    pagination.page = pagination.next_page ?? 1;
    reloadMailingList();
  }
  function handlePrevious() {
    pagination.page = pagination.prev_page ?? 1;
    reloadMailingList();
  }

  function handleFormModal() {
    openModal = true;
  }
  function handleUpdateModal(mailingList: MailingList) {
    currentSelected = mailingList;
    modalMode = "update";
    openModal = true;
  }

  function handleCloseModal() {
    openModal = false;
    currentSelected = defaultMailList;
    modalMode = "create";
    reloadMailingList();
  }
</script>

<MailinglistForm
  bind:open={openModal}
  formMode={modalMode}
  data={currentSelected}
  on:close={handleCloseModal}
></MailinglistForm>

<div class="w-full h-full px-4 grid gap-3">
  <div class="grid-flow-row">
    <Heading tag="h3" class="mb-4">Configuracion General</Heading>
  </div>
  <div class="grid-flow-row">
    <Heading tag="h5" class="mb-4">Configuracion Predeterminada</Heading>
    {#if error}
      <Alert type="error" dismissable>{error}</Alert>
    {/if}
    {#if success}
      <Alert type="success" dismissable>{success}</Alert>
    {/if}
    <GeneralConfigForm
      currentState={globalSetting}
      on:update={handleUpdate}
      {isLoading}
    ></GeneralConfigForm>
  </div>

  <!-- Servicio de correos -->
  <div class="grid-flow-row">
    <Heading tag="h5" class="mb-2">Servicio de Correos</Heading>
    {#if smtpStatus}
      <div class="p-4 border rounded-lg bg-gray-50 grid gap-2">
        <div class="flex items-center gap-2">
          <span class="font-semibold text-sm">Estado:</span>
          <Badge color={smtpStatus.configured ? "green" : "red"}>
            {smtpStatus.configured ? "Activo" : "No configurado"}
          </Badge>
        </div>
        <p class="text-sm text-gray-600">{smtpStatus.note}</p>
        {#if !smtpStatus.configured}
          <div class="mt-2">
            <p class="text-xs font-semibold text-gray-500 mb-1">
              Variables de entorno requeridas en el servidor:
            </p>
            <div class="flex flex-wrap gap-1">
              {#each smtpStatus.requiredEnvVars as v}
                <code class="text-xs bg-gray-200 px-2 py-0.5 rounded">{v}</code>
              {/each}
            </div>
            <p class="text-xs font-semibold text-gray-500 mt-2 mb-1">
              Opcionales:
            </p>
            <div class="flex flex-wrap gap-1">
              {#each smtpStatus.optionalEnvVars as v}
                <code class="text-xs bg-gray-200 px-2 py-0.5 rounded">{v}</code>
              {/each}
            </div>
            <p class="text-xs text-gray-400 mt-2">
              Estas variables deben configurarse manualmente en el servidor donde
              corre el backend. Una vez configuradas, el servicio se activará
              automáticamente.
            </p>
          </div>
        {/if}
      </div>
    {:else}
      <p class="text-sm text-gray-400">Cargando estado del servicio de correos...</p>
    {/if}
  </div>

  <div class="grid-flow-row">
    <Heading tag="h5" class="mb-4">Notificaciones</Heading>
    <div class="mt-3 mb-3">
      <Button size="xs" color="primary" on:click={handleFormModal}
        ><PlusOutline /> Agregar</Button
      >
    </div>
    <Table
      data={mailingList}
      headers={tableHeaders}
      {pagination}
      on:next={handleNext}
      on:previous={handlePrevious}
    >
      <TableBodyRow slot="row" let:row>
        <TableBodyCell>{row.email}</TableBodyCell>
        <TableBodyCell>{row.name}</TableBodyCell>
        <TableBodyCell>
          <Badge color={row.active ? "green" : "red"}
            >{row.active ? "Activo" : "Inactivo"}</Badge
          >
        </TableBodyCell>
        <TableBodyCell>
          <Button size="xs" color="alternative" on:click={() => handleUpdateModal(row)}>
            Editar
          </Button>
        </TableBodyCell>
      </TableBodyRow>
    </Table>
  </div>
</div>
