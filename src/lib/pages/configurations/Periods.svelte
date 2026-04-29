<script lang="ts">
  import {
    Alert,
    Button,
    Heading,
    Label,
    Modal,
    Select,
    Spinner,
    TableBodyCell,
    TableBodyRow,
  } from "flowbite-svelte";
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import Table from "$lib/components/Table.svelte";
  import {
    closePeriod,
    createPeriod,
    getPeriods,
    updatePeriod,
  } from "$lib/services/period.service";
  import {
    exportPeriodsToExcel,
    exportPeriodsToPdf,
  } from "$lib/utils/period-export";
  import { authReady, userStore } from "$stores/user.store";
  import { hasAnyPermission } from "$lib/utils/permissions";
  import type { Period, TableHeader, TablePagination, User } from "$lib/types";

  let periods: Period[] = [];
  let error: string | null = null;
  let success: string | null = null;
  let pagination: TablePagination = { page: 1 };
  let exportingPdf = false;
  let exportingExcel = false;
  let exportModalOpen = false;
  let periodOptions: Period[] = [];
  let selectedPeriodId = "all";
  let selectedFormat: "pdf" | "excel" = "pdf";
  let formOpen = false;
  let formMode: "create" | "update" = "create";
  let selectedPeriodIdForEdit: number | null = null;
  let formData = {
    name: "",
    start: "",
    end: "",
  };
  let formSaving = false;
  let closeModalOpen = false;
  let closeTargetPeriod: Period | null = null;
  let closing = false;
  let currentUser: User | null = null;
  let canWrite = false;
  userStore.subscribe((value) => {
    currentUser = value.dbUser ?? null;
  });

  $: canWrite = hasAnyPermission(currentUser, ["periods.write"]);

  const PERIOD_STATUS_LABELS: Record<string, string> = {
    PENDING: "Pendiente",
    ACTIVE: "Activo",
    FINISHED: "Finalizado",
    CLOSED: "Cerrado",
  };

  function periodStatusLabel(value: string) {
    return PERIOD_STATUS_LABELS[value] ?? value;
  }

  const headers: TableHeader[] = [
    { name: "Nombre", field: "name" },
    {
      name: "Inicio",
      field: "start",
      formatter: (value: string | Date) => new Date(value).toLocaleDateString(),
    },
    {
      name: "Fin",
      field: "end",
      formatter: (value: string | Date) => new Date(value).toLocaleDateString(),
    },
    { name: "Estado", field: "status" },
    { name: "Acciones", field: "actions" },
  ];

  async function loadPeriods() {
    const res = await getPeriods({ page: pagination.page });

    if (!res) {
      periods = [];
      error = "No se pudieron cargar periodos.";
      return;
    }

    periods = res.data ?? [];
    pagination.page = res.page ?? 1;
    pagination.next_page = res.next_page;
    pagination.prev_page = res.prev_page;
    error = null;
  }

  function toInputDate(value: string | Date) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return "";
    }
    return parsed.toISOString().slice(0, 10);
  }

  function resetForm() {
    selectedPeriodIdForEdit = null;
    formData = {
      name: "",
      start: "",
      end: "",
    };
  }

  function openCreateForm() {
    if (!canWrite) {
      error = "No tienes permisos para crear periodos.";
      return;
    }
    formMode = "create";
    resetForm();
    error = null;
    formOpen = true;
  }

  function openEditForm(period: Period) {
    if (!canWrite) {
      error = "No tienes permisos para editar periodos.";
      return;
    }
    formMode = "update";
    selectedPeriodIdForEdit = period.id;
    formData = {
      name: period.name,
      start: toInputDate(period.start),
      end: toInputDate(period.end),
    };
    error = null;
    formOpen = true;
  }

  async function savePeriod() {
    if (!canWrite) {
      error = "No tienes permisos para guardar periodos.";
      return;
    }
    if (!formData.name.trim() || !formData.start || !formData.end) {
      error = "Completa nombre, fecha de inicio y fecha de fin.";
      return;
    }

    if (new Date(formData.start) > new Date(formData.end)) {
      error = "La fecha de inicio no puede ser mayor que la fecha de fin.";
      return;
    }

    formSaving = true;
    const payload = {
      name: formData.name.trim(),
      start: new Date(formData.start).toISOString(),
      end: new Date(formData.end).toISOString(),
    };

    let result = null;
    if (formMode === "create") {
      result = await createPeriod(payload);
    } else if (selectedPeriodIdForEdit) {
      result = await updatePeriod(selectedPeriodIdForEdit, payload);
    }

    if (!result) {
      error = "No se pudo guardar el periodo.";
      formSaving = false;
      return;
    }

    formOpen = false;
    formSaving = false;
    resetForm();
    await loadPeriods();
  }

  function waitForAuthReady(): Promise<void> {
    if (get(authReady)) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const unsubscribe = authReady.subscribe((value) => {
        if (value) {
          unsubscribe();
          resolve();
        }
      });
    });
  }

  function nextPage() {
    pagination.page = pagination.next_page ?? pagination.page;
    loadPeriods();
  }

  function previousPage() {
    pagination.page = pagination.prev_page ?? pagination.page;
    loadPeriods();
  }

  async function getAllPeriods(): Promise<Period[]> {
    let page = 1;
    const size = 100;
    const allPeriods: Period[] = [];
    let safety = 0;

    while (safety < 100) {
      safety += 1;
      const res = await getPeriods({ page, size });

      if (!res) {
        throw new Error("No se pudieron cargar los periodos para exportar");
      }

      allPeriods.push(...(res.data ?? []));

      if (!res.next_page) {
        break;
      }

      page = res.next_page;
    }

    return allPeriods;
  }

  async function handleExportPdf() {
    exportingPdf = true;
    try {
      const allPeriods = await getAllPeriods();
      exportPeriodsToPdf(allPeriods);
    } catch (e) {
      error = "No se pudo generar el PDF de periodos.";
    } finally {
      exportingPdf = false;
    }
  }

  async function handleExportExcel() {
    exportingExcel = true;
    try {
      const allPeriods = await getAllPeriods();
      exportPeriodsToExcel(allPeriods);
    } catch (e) {
      error = "No se pudo generar el Excel de periodos.";
    } finally {
      exportingExcel = false;
    }
  }

  function openCloseModal(period: Period) {
    if (!canWrite) {
      error = "No tienes permisos para cerrar periodos.";
      return;
    }
    if (period.status === "CLOSED") {
      error = "Este periodo ya está cerrado.";
      return;
    }
    closeTargetPeriod = period;
    error = null;
    success = null;
    closeModalOpen = true;
  }

  async function confirmClosePeriod() {
    if (!closeTargetPeriod) return;
    closing = true;
    const res = await closePeriod(closeTargetPeriod.id);
    closing = false;

    if (!res) {
      error =
        "No se pudo cerrar el periodo. Revisa que no esté cerrado ya y vuelve a intentar.";
      closeModalOpen = false;
      return;
    }

    closeModalOpen = false;
    success = `Periodo "${closeTargetPeriod.name}" cerrado. Correos enviados: ${res.emailsSent}. Omitidos por falta de correo o SMTP inactivo: ${res.emailsSkipped}.`;
    closeTargetPeriod = null;
    await loadPeriods();
  }

  async function openExportModal() {
    try {
      periodOptions = await getAllPeriods();
      selectedPeriodId = "all";
      selectedFormat = "pdf";
      exportModalOpen = true;
    } catch (e) {
      error = "No se pudieron cargar periodos para exportar.";
    }
  }

  async function confirmExport() {
    const selectedPeriods =
      selectedPeriodId === "all"
        ? periodOptions
        : periodOptions.filter((item) => `${item.id}` === selectedPeriodId);

    if (selectedPeriods.length === 0) {
      error = "Selecciona un periodo válido para descargar.";
      return;
    }

    exportModalOpen = false;

    if (selectedFormat === "pdf") {
      exportingPdf = true;
      try {
        exportPeriodsToPdf(selectedPeriods);
      } catch (e) {
        error = "No se pudo generar el PDF de periodos.";
      } finally {
        exportingPdf = false;
      }
      return;
    }

    exportingExcel = true;
    try {
      exportPeriodsToExcel(selectedPeriods);
    } catch (e) {
      error = "No se pudo generar el Excel de periodos.";
    } finally {
      exportingExcel = false;
    }
  }

  onMount(async () => {
    await waitForAuthReady();
    await loadPeriods();
  });
</script>

<div class="w-full h-full px-4 grid gap-3">
  <div class="flex items-center justify-between gap-3">
    <Heading tag="h3" class="mb-2">Configuración de periodos</Heading>
    <div class="flex gap-2">
      {#if canWrite}
        <Button size="sm" color="alternative" on:click={openCreateForm}
          >Nuevo periodo</Button
        >
      {/if}
      <Button
        size="sm"
        color="primary"
        on:click={openExportModal}
        disabled={exportingPdf || exportingExcel}
      >
        Descargar reporte
        {#if exportingPdf || exportingExcel}
          <Spinner size="sm" class="ml-2" />
        {/if}
      </Button>
    </div>
  </div>

  {#if error}
    <Alert type="error" dismissable>{error}</Alert>
  {/if}

  {#if success}
    <Alert color="green" dismissable>{success}</Alert>
  {/if}

  <Table
    data={periods}
    {headers}
    {pagination}
    on:next={nextPage}
    on:previous={previousPage}
  >
    <TableBodyRow slot="row" let:row>
      <TableBodyCell>{row.name}</TableBodyCell>
      <TableBodyCell>{new Date(row.start).toLocaleDateString()}</TableBodyCell>
      <TableBodyCell>{new Date(row.end).toLocaleDateString()}</TableBodyCell>
      <TableBodyCell>{periodStatusLabel(row.status)}</TableBodyCell>
      <TableBodyCell>
        {#if canWrite}
          <div class="flex flex-wrap gap-2">
            <Button
              size="xs"
              color="alternative"
              on:click={() => openEditForm(row)}
            >
              Editar
            </Button>
            {#if row.status !== "CLOSED"}
              <Button
                size="xs"
                color="red"
                on:click={() => openCloseModal(row)}
              >
                Cerrar
              </Button>
            {/if}
          </div>
        {:else}
          -
        {/if}
      </TableBodyCell>
    </TableBodyRow>
  </Table>
</div>

<Modal
  title={formMode === "create" ? "Crear periodo" : "Editar periodo"}
  bind:open={formOpen}
  outsideclose
>
  <div class="grid gap-4">
    <div>
      <Label class="mb-1 block" for="period-name">Nombre</Label>
      <input
        id="period-name"
        type="text"
        class="w-full rounded-lg border border-gray-300 px-3 py-2"
        bind:value={formData.name}
        placeholder="Periodo 2026-1"
      />
    </div>
    <div>
      <Label class="mb-1 block" for="period-start">Fecha inicio</Label>
      <input
        id="period-start"
        type="date"
        class="w-full rounded-lg border border-gray-300 px-3 py-2"
        bind:value={formData.start}
      />
    </div>
    <div>
      <Label class="mb-1 block" for="period-end">Fecha fin</Label>
      <input
        id="period-end"
        type="date"
        class="w-full rounded-lg border border-gray-300 px-3 py-2"
        bind:value={formData.end}
      />
    </div>
  </div>

  <svelte:fragment slot="footer">
    <Button color="primary" on:click={savePeriod} disabled={formSaving}>
      {formMode === "create" ? "Crear" : "Guardar"}
      {#if formSaving}
        <Spinner size="sm" class="ml-2" />
      {/if}
    </Button>
  </svelte:fragment>
</Modal>

<Modal title="Cerrar periodo" bind:open={closeModalOpen} outsideclose>
  <div class="grid gap-3">
    <p>
      Estás a punto de cerrar el periodo
      <strong>{closeTargetPeriod?.name ?? ""}</strong>.
    </p>
    <p class="text-sm text-gray-600">
      Al cerrar el periodo se enviará un correo con el reporte en PDF (días,
      tarifa y total) a cada estudiante con horas aprobadas. Esta acción no se
      puede revertir.
    </p>
  </div>

  <svelte:fragment slot="footer">
    <Button
      color="alternative"
      on:click={() => (closeModalOpen = false)}
      disabled={closing}
    >
      Cancelar
    </Button>
    <Button color="red" on:click={confirmClosePeriod} disabled={closing}>
      Cerrar periodo
      {#if closing}
        <Spinner size="sm" class="ml-2" />
      {/if}
    </Button>
  </svelte:fragment>
</Modal>

<Modal
  title="Descargar reporte de periodos"
  bind:open={exportModalOpen}
  outsideclose
>
  <div class="grid gap-4">
    <div>
      <Label class="mb-1 block">Periodo</Label>
      <Select bind:value={selectedPeriodId}>
        <option value="all">Todos los periodos</option>
        {#each periodOptions as period}
          <option value={`${period.id}`}>{period.name}</option>
        {/each}
      </Select>
    </div>

    <div>
      <Label class="mb-1 block">Formato</Label>
      <Select bind:value={selectedFormat}>
        <option value="pdf">PDF formal</option>
        <option value="excel">Excel (.xlsx)</option>
      </Select>
    </div>
  </div>

  <svelte:fragment slot="footer">
    <Button color="primary" on:click={confirmExport}>Descargar</Button>
  </svelte:fragment>
</Modal>
