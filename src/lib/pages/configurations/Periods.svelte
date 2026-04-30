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
  import { navigate } from "svelte-routing";
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import Table from "$lib/components/Table.svelte";
  import {
    closePeriod,
    createPeriod,
    downloadPeriodReport,
    getPeriods,
    reopenPeriod,
    updatePeriod,
  } from "$lib/services/period.service";
  import {
    getWorkHours,
    updateWorkHours,
  } from "$lib/services/work-hours.service";
  import {
    exportPeriodsToExcel,
    exportPeriodHoursToExcel,
  } from "$lib/utils/period-export";
  import { downloadBlob } from "$lib/utils/download";
  import { authReady, userStore } from "$stores/user.store";
  import { hasAnyPermission } from "$lib/utils/permissions";
  import type {
    Period,
    TableHeader,
    TablePagination,
    User,
    WorkHours,
  } from "$lib/types";

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

  // Student-hours expansion state
  let expandedPeriodId: number | null = null;
  let periodHours: WorkHours[] = [];
  let loadingPeriodHours = false;
  let expandedStudentIds = new Set<number>();
  let hoursEdits: Record<
    number,
    { amount: number; price: number; saving: boolean }
  > = {};
  let closeModalOpen = false;
  let closeTargetPeriod: Period | null = null;
  let closing = false;
  let reopenModalOpen = false;
  let reopenTargetPeriod: Period | null = null;
  let reopenStatus: "ACTIVE" | "FINISHED" | "PENDING" = "ACTIVE";
  let reopening = false;
  let currentUser: User | null = null;
  let canWrite = false;
  let canReopen = false;
  let canViewWorkHours = false;
  userStore.subscribe((value) => {
    currentUser = value.dbUser ?? null;
  });

  $: canWrite = hasAnyPermission(currentUser, ["periods.write"]);
  $: canReopen = hasAnyPermission(currentUser, ["periods.reopen"]);
  $: canViewWorkHours = hasAnyPermission(currentUser, ["work-hours.read"]);

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

  async function togglePeriodHours(period: Period) {
    if (expandedPeriodId === period.id) {
      expandedPeriodId = null;
      periodHours = [];
      expandedStudentIds = new Set();
      hoursEdits = {};
      return;
    }
    expandedPeriodId = period.id;
    periodHours = [];
    expandedStudentIds = new Set();
    hoursEdits = {};
    loadingPeriodHours = true;
    const res = await getWorkHours({ periodId: period.id, size: 200 });
    periodHours = res?.data ?? [];
    loadingPeriodHours = false;
  }

  function groupHoursByStudent(hours: WorkHours[]) {
    const map = new Map<
      number,
      { student: WorkHours["student"]; hours: WorkHours[]; totalHours: number }
    >();
    for (const h of hours) {
      if (!h.studentId) continue;
      if (!map.has(h.studentId)) {
        map.set(h.studentId, { student: h.student, hours: [], totalHours: 0 });
      }
      const entry = map.get(h.studentId)!;
      entry.hours.push(h);
      entry.totalHours += h.amount ?? 0;
    }
    return [...map.values()];
  }

  $: studentsInPeriod = groupHoursByStudent(periodHours);

  function toggleStudent(studentId: number) {
    const next = new Set(expandedStudentIds);
    if (next.has(studentId)) {
      next.delete(studentId);
    } else {
      next.add(studentId);
    }
    expandedStudentIds = next;
  }

  function initHoursEdit(hour: WorkHours) {
    if (!hoursEdits[hour.id]) {
      hoursEdits = {
        ...hoursEdits,
        [hour.id]: {
          amount: hour.amount ?? 0,
          price: hour.price ?? 0,
          saving: false,
        },
      };
    }
    return hoursEdits[hour.id];
  }

  async function saveHourEdit(hourId: number) {
    const edit = hoursEdits[hourId];
    if (!edit) return;
    hoursEdits = { ...hoursEdits, [hourId]: { ...edit, saving: true } };
    const updated = await updateWorkHours(hourId, {
      amount: edit.amount,
      price: edit.price,
    });
    hoursEdits = { ...hoursEdits, [hourId]: { ...edit, saving: false } };
    if (updated) {
      periodHours = periodHours.map((h) =>
        h.id === hourId
          ? {
              ...h,
              amount: edit.amount,
              price: edit.price,
              total: edit.amount * edit.price,
            }
          : h,
      );
      success = "Horas actualizadas.";
    } else {
      error = "No se pudo actualizar el registro.";
    }
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
    if (res.reason) {
      success = `Periodo "${closeTargetPeriod.name}" cerrado. ${res.reason}`;
    } else {
      success = `Periodo "${closeTargetPeriod.name}" cerrado. Correos enviados: ${res.emailsSent}. Omitidos: ${res.emailsSkipped}. Aprobadas: ${res.approvedCount}. Pendientes: ${res.pendingCount}. Rechazadas: ${res.rejectedCount}.`;
    }
    closeTargetPeriod = null;
    await loadPeriods();
  }

  function openReopenModal(period: Period) {
    if (!canReopen) {
      error = "No tienes permisos para reabrir periodos.";
      return;
    }
    reopenTargetPeriod = period;
    reopenStatus = "ACTIVE";
    reopenModalOpen = true;
  }

  async function confirmReopenPeriod() {
    if (!reopenTargetPeriod) return;
    reopening = true;
    const res = await reopenPeriod(reopenTargetPeriod.id, reopenStatus);
    reopening = false;

    if (!res) {
      error = "No se pudo reabrir el periodo.";
      return;
    }

    success = `Periodo "${reopenTargetPeriod.name}" reabierto con estado ${periodStatusLabel(reopenStatus)}.`;
    reopenModalOpen = false;
    reopenTargetPeriod = null;
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

    if (selectedFormat === "pdf") {
      if (selectedPeriods.length !== 1) {
        error = "El PDF solo se puede generar para un periodo a la vez.";
        return;
      }
      exportModalOpen = false;
      exportingPdf = true;
      try {
        const target = selectedPeriods[0];
        const pdf = (await downloadPeriodReport(target.id)) as Blob;
        const safeName = `${target.name || `periodo-${target.id}`}`.replace(
          /\s+/g,
          "_",
        );
        downloadBlob(pdf, `reporte-${safeName}.pdf`);
      } catch (e) {
        error =
          e instanceof Error
            ? e.message
            : "No se pudo generar el PDF de periodos.";
      } finally {
        exportingPdf = false;
      }
      return;
    }

    exportModalOpen = false;
    exportingExcel = true;
    try {
      if (selectedPeriods.length === 1) {
        const target = selectedPeriods[0];
        const hoursRes = await getWorkHours({
          periodId: target.id,
          size: 1000,
        });
        const hoursData = (hoursRes?.data ?? []).map((h) => ({
          studentName: h.student?.name ?? "-",
          studentCode: h.student?.code ?? "-",
          departmentName: h.department?.name ?? "-",
          date: new Date(h.start),
          description: h.name ?? "Horas beca",
          status: h.status,
          hours: h.amount ?? 0,
          pricePerHour: h.price ?? 0,
        }));
        exportPeriodHoursToExcel(target, hoursData);
      } else {
        exportPeriodsToExcel(selectedPeriods);
      }
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
        <div class="flex flex-wrap gap-2">
          {#if canViewWorkHours || canWrite}
            <Button
              size="xs"
              color={expandedPeriodId === row.id ? "dark" : "alternative"}
              on:click={() => togglePeriodHours(row)}
            >
              {expandedPeriodId === row.id ? "Cerrar" : "Editar"}
            </Button>
          {/if}
          {#if canWrite && (row.status !== "CLOSED" || canReopen)}
            <Button
              size="xs"
              color="alternative"
              on:click={() => openEditForm(row)}
            >
              Datos
            </Button>
          {/if}
          {#if row.status !== "CLOSED"}
            {#if canWrite}
              <Button
                size="xs"
                color="red"
                on:click={() => openCloseModal(row)}
              >
                Cerrar
              </Button>
            {/if}
          {:else if canReopen}
            <Button
              size="xs"
              color="primary"
              on:click={() => openReopenModal(row)}
            >
              Reabrir
            </Button>
          {/if}
          {#if !canViewWorkHours && !canWrite && !canReopen}
            -
          {/if}
        </div>
      </TableBodyCell>
    </TableBodyRow>
    {#if expandedPeriodId === row.id}
      <TableBodyRow>
        <TableBodyCell colspan={5} class="p-0 bg-gray-50">
          <div class="p-4">
            {#if loadingPeriodHours}
              <p class="text-sm text-gray-500 text-center py-4">
                Cargando estudiantes...
              </p>
            {:else if studentsInPeriod.length === 0}
              <p class="text-sm text-gray-500 text-center py-4">
                Sin registros de horas en este período.
              </p>
            {:else}
              <div class="grid gap-2">
                {#each studentsInPeriod as { student, hours, totalHours }}
                  {@const studentId = student?.id ?? hours[0]?.studentId ?? 0}
                  <div
                    class="border rounded-lg bg-white overflow-hidden shadow-sm"
                  >
                    <button
                      class="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                      on:click={() => toggleStudent(studentId)}
                    >
                      <div>
                        <p class="font-medium text-sm">
                          {student?.name ?? `Estudiante ${studentId}`}
                        </p>
                        <p class="text-xs text-gray-500">
                          {student?.code ?? ""}
                        </p>
                      </div>
                      <div
                        class="flex items-center gap-3 text-xs text-gray-500 shrink-0"
                      >
                        <span class="font-medium"
                          >{totalHours.toFixed(2)} hrs</span
                        >
                        <span class="text-base"
                          >{expandedStudentIds.has(studentId) ? "▲" : "▼"}</span
                        >
                      </div>
                    </button>
                    {#if expandedStudentIds.has(studentId)}
                      <div class="border-t divide-y">
                        {#each hours as hour}
                          {@const edit = initHoursEdit(hour)}
                          <div
                            class="px-4 py-3 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-3 items-center"
                          >
                            <div class="min-w-0">
                              <p class="text-xs text-gray-400">
                                {new Date(hour.start).toLocaleDateString(
                                  "es-CR",
                                )}
                              </p>
                              <p class="text-sm truncate">
                                {hour.name ?? "Horas beca"}
                              </p>
                              <p class="text-xs text-gray-400 capitalize">
                                {hour.status?.toLowerCase()}
                              </p>
                            </div>
                            <div class="flex flex-col gap-0.5">
                              <label class="text-xs text-gray-500">Horas</label>
                              <input
                                type="number"
                                min="0"
                                step="0.25"
                                value={edit.amount}
                                on:input={(e) => {
                                  hoursEdits[hour.id].amount = parseFloat(
                                    e.currentTarget.value,
                                  );
                                  hoursEdits = { ...hoursEdits };
                                }}
                                class="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                              />
                            </div>
                            <div class="flex flex-col gap-0.5">
                              <label class="text-xs text-gray-500">₡/hr</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={edit.price}
                                on:input={(e) => {
                                  hoursEdits[hour.id].price = parseFloat(
                                    e.currentTarget.value,
                                  );
                                  hoursEdits = { ...hoursEdits };
                                }}
                                class="w-24 rounded border border-gray-300 px-2 py-1 text-sm"
                              />
                            </div>
                            <Button
                              size="xs"
                              color="primary"
                              disabled={edit.saving}
                              on:click={() => saveHourEdit(hour.id)}
                            >
                              {edit.saving ? "..." : "Guardar"}
                            </Button>
                          </div>
                        {/each}
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </TableBodyCell>
      </TableBodyRow>
    {/if}
  </Table>
</div>

<Modal
  title={formMode === "create" ? "Crear periodo" : "Editar datos del periodo"}
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
      puede revertir sin un permiso especial para reabrir.
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

<Modal title="Reabrir periodo" bind:open={reopenModalOpen} outsideclose>
  <div class="grid gap-3">
    <p>
      Selecciona el estado con el que deseas reabrir el periodo
      <strong>{reopenTargetPeriod?.name ?? ""}</strong>.
    </p>
    <div>
      <Label class="mb-1 block">Estado</Label>
      <Select bind:value={reopenStatus}>
        <option value="ACTIVE">Activo</option>
        <option value="FINISHED">Finalizado</option>
        <option value="PENDING">Pendiente</option>
      </Select>
    </div>
  </div>

  <svelte:fragment slot="footer">
    <Button
      color="alternative"
      on:click={() => (reopenModalOpen = false)}
      disabled={reopening}
    >
      Cancelar
    </Button>
    <Button color="primary" on:click={confirmReopenPeriod} disabled={reopening}>
      Reabrir
      {#if reopening}
        <Spinner size="sm" class="ml-2" />
      {/if}
    </Button>
  </svelte:fragment>
</Modal>
