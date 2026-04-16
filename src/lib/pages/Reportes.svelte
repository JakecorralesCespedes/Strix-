<script lang="ts">
  import { Alert, Button, Card, Heading, P, Select } from "flowbite-svelte";
  import { navigate } from "svelte-routing";
  import { onMount } from "svelte";
  import { getPeriods } from "$lib/services/period.service";
  import { getDepartment } from "$lib/services/department.service";
  import {
    applyPayroll,
    previewPayroll,
    type PayrollPreviewResponse,
  } from "$lib/services/scholarship-payroll.service";
  import { userStore } from "../../stores/user.store";
  import type { Department, Period, User } from "$lib/types";

  const hardcodedReports = [
    {
      title: "Reporte de Periodos",
      description:
        "Genera PDF formal o Excel seleccionando un periodo desde la seccion de Periodos.",
      actionLabel: "Ir a Periodos",
      actionPath: "/configuraciones",
    },
    {
      title: "Reporte de Solicitudes",
      description:
        "Visualiza solicitudes por estudiante y departamento con estado de aprobacion.",
      actionLabel: "Ver Solicitudes",
      actionPath: "/solicitudes",
    },
    {
      title: "Reporte de Horas Beca",
      description:
        "Consulta resumen de horas registradas, aprobadas y monto acumulado.",
      actionLabel: "Ver Horas Beca",
      actionPath: "/horas-beca",
    },
  ];

  let periods: Period[] = [];
  let departments: Department[] = [];
  let currentUser: User | null = null;
  let selectedPeriodId: number | null = null;
  let selectedDepartmentId: number | null = null;
  let closePeriod = false;
  let preview: PayrollPreviewResponse | null = null;
  let loading = false;
  let error: string | null = null;
  let success: string | null = null;

  userStore.subscribe((value) => {
    currentUser = value.dbUser ?? null;
    if (currentUser?.role?.name !== "Admin") {
      selectedDepartmentId = currentUser?.departmentId ?? null;
    } else if (selectedDepartmentId === null) {
      selectedDepartmentId = 0;
    }
  });

  function pickDefaultPeriod(list: Period[]) {
    const active = list.find((item) => item.status === "ACTIVE");
    return active ?? list[0];
  }

  async function loadPeriods() {
    const res = await getPeriods({ page: 1, size: 200 });
    periods = res?.data ?? [];

    if (!selectedPeriodId && periods.length) {
      const chosen = pickDefaultPeriod(periods);
      selectedPeriodId = chosen?.id ?? null;
    }
  }

  async function loadDepartments() {
    const res = await getDepartment({ page: 1, size: 200 });
    departments = res?.data ?? [];

    if (currentUser?.role?.name !== "Admin") {
      selectedDepartmentId = currentUser?.departmentId ?? null;
    } else if (selectedDepartmentId === null) {
      selectedDepartmentId = 0;
    }
  }

  async function handlePreview() {
    if (!selectedPeriodId) {
      error = "Selecciona un periodo para previsualizar.";
      return;
    }

    loading = true;
    error = null;
    success = null;

    try {
      preview = await previewPayroll({
        periodId: selectedPeriodId,
        departmentId:
          currentUser?.role?.name === "Admin"
            ? selectedDepartmentId && selectedDepartmentId > 0
              ? selectedDepartmentId
              : undefined
            : currentUser?.departmentId ?? undefined,
      });
    } catch (err) {
      error = "No se pudo generar la previsualizacion.";
    } finally {
      loading = false;
    }
  }

  async function handleApply() {
    if (!selectedPeriodId) {
      error = "Selecciona un periodo para aplicar.";
      return;
    }

    loading = true;
    error = null;
    success = null;

    try {
      const result = await applyPayroll({
        periodId: selectedPeriodId,
        departmentId:
          currentUser?.role?.name === "Admin"
            ? selectedDepartmentId && selectedDepartmentId > 0
              ? selectedDepartmentId
              : undefined
            : currentUser?.departmentId ?? undefined,
        closePeriod,
      });

      const appliedItems = (result.items ?? []).map((item) => ({
        ...item,
        receivable: item.receivable ?? item.recivable ?? 0,
      }));

      preview = preview
        ? { ...preview, totals: result.totals }
        : {
            items: appliedItems,
            totals: result.totals,
          };
      success = `Aplicacion completada: ${result.appliedCount} registros.`;
    } catch (err) {
      error = "No se pudo aplicar la previsualizacion.";
    } finally {
      loading = false;
    }
  }

  function resolvePrice(item: any) {
    const price = Number(item.pricePerHour);
    if (Number.isFinite(price)) {
      return price;
    }
    if (Number.isFinite(item.subtotal) && Number.isFinite(item.hours) && item.hours) {
      return Number((item.subtotal / item.hours).toFixed(2));
    }
    return "-";
  }

  onMount(() => {
    loadPeriods();
    loadDepartments();
  });
</script>

<div class="mt-4 grid gap-6">
  <div class="grid gap-4">
    <Heading tag="h3">Reportes</Heading>
    <P class="text-gray-600">
      Panel rapido para abrir los reportes disponibles del sistema.
    </P>

    <div class="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
      {#each hardcodedReports as report}
        <Card>
          <h5 class="text-lg font-semibold">{report.title}</h5>
          <p class="text-sm text-gray-600 mt-2">{report.description}</p>
          <div class="mt-4">
            <Button size="sm" on:click={() => navigate(report.actionPath)}
              >{report.actionLabel}</Button
            >
          </div>
        </Card>
      {/each}
    </div>
  </div>

  <div class="grid gap-4">
    <Heading tag="h4">Aplicacion de horas beca</Heading>
    <P class="text-gray-600">
      Previsualiza y aplica horas aprobadas para el periodo seleccionado.
    </P>

    {#if error}
      <Alert type="error" dismissable>{error}</Alert>
    {/if}

    {#if success}
      <Alert type="success" dismissable>{success}</Alert>
    {/if}

    <div class="grid md:grid-cols-3 gap-3">
      <div>
        <p class="text-sm text-gray-500">Periodo</p>
        <Select bind:value={selectedPeriodId} disabled={!periods.length}>
          {#each periods as period}
            <option value={period.id}>{period.name}</option>
          {/each}
        </Select>
      </div>

      <div>
        <p class="text-sm text-gray-500">Departamento</p>
        <Select
          bind:value={selectedDepartmentId}
          disabled={currentUser?.role?.name !== "Admin"}
        >
          {#if currentUser?.role?.name === "Admin"}
            <option value={0}>Todos los departamentos</option>
          {/if}
          {#each departments as department}
            <option value={department.id}>{department.name}</option>
          {/each}
        </Select>
      </div>

      <div class="flex items-end gap-2">
        <Button color="alternative" on:click={handlePreview} disabled={loading}>
          Previsualizar
        </Button>
        <Button color="primary" on:click={handleApply} disabled={loading}>
          Aplicar
        </Button>
      </div>
    </div>

    <label class="flex items-center gap-2 text-sm text-gray-600">
      <input type="checkbox" bind:checked={closePeriod} />
      Cerrar periodo al aplicar
    </label>

    {#if preview}
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="text-left text-gray-500">
            <tr>
              <th class="py-2 pr-3">Estudiante</th>
              <th class="py-2 pr-3">Departamento</th>
              <th class="py-2 pr-3">Horas</th>
              <th class="py-2 pr-3">Precio</th>
              <th class="py-2 pr-3">Subtotal</th>
              <th class="py-2 pr-3">Diezmo</th>
              <th class="py-2 pr-3">Total</th>
              <th class="py-2 pr-3">Pagar</th>
              <th class="py-2 pr-3">Cobrar</th>
            </tr>
          </thead>
          <tbody>
            {#each preview.items as item}
              <tr class="border-t">
                <td class="py-2 pr-3">{item.student?.name ?? `ID ${item.studentId}`}</td>
                <td class="py-2 pr-3">{item.department?.name ?? `ID ${item.departmentId}`}</td>
                <td class="py-2 pr-3">{item.hours}</td>
                <td class="py-2 pr-3">{resolvePrice(item)}</td>
                <td class="py-2 pr-3">{item.subtotal}</td>
                <td class="py-2 pr-3">{item.tithe}</td>
                <td class="py-2 pr-3">{item.total}</td>
                <td class="py-2 pr-3">{item.payable}</td>
                <td class="py-2 pr-3">{item.receivable ?? item.recivable ?? 0}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div class="grid md:grid-cols-3 gap-3 text-sm text-gray-700">
        <div><strong>Horas:</strong> {preview.totals.hours}</div>
        <div><strong>Subtotal:</strong> {preview.totals.subtotal}</div>
        <div><strong>Diezmo:</strong> {preview.totals.tithe}</div>
        <div><strong>Total:</strong> {preview.totals.total}</div>
        <div><strong>Pagar:</strong> {preview.totals.payable}</div>
        <div><strong>Cobrar:</strong> {preview.totals.receivable}</div>
      </div>
    {/if}
  </div>
</div>
