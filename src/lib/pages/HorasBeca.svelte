<script lang="ts">
  import {
    Alert,
    Badge,
    Button,
    Checkbox,
    Heading,
    Input,
    Label,
    Modal,
    Select,
    Toggle,
  } from "flowbite-svelte";
  import { onMount } from "svelte";
  import Table from "$lib/components/Table.svelte";
  import {
    createWorkHours,
    getWorkHours,
    updateWorkHours,
  } from "$lib/services/work-hours.service";
  import { getDepartment } from "$lib/services/department.service";
  import { getPeriods } from "$lib/services/period.service";
  import { getScholarshipRequests } from "$lib/services/scholarship-request.service";
  import { getStudents } from "$lib/services/student.service";
  import {
    getDepartmentPrices,
    type DepartmentPrice,
  } from "$lib/services/department-prices.service";
  import { hasAnyPermission } from "$lib/utils/permissions";
  import { userStore } from "../../stores/user.store";
  import type {
    Department,
    Period,
    Student,
    StudentOnDepartment,
    TableHeader,
    TablePagination,
    User,
    WorkHours,
  } from "$lib/types";

  const STATUS_LABELS: Record<string, string> = {
    PENDING: "Pendiente",
    APPROVED: "Aprobada",
    REJECTED: "Rechazada",
  };

  let workHours: WorkHours[] = [];
  let error: string | null = null;
  let success: string | null = null;
  let pagination: TablePagination = { page: 1 };
  let departments: Department[] = [];
  let periods: Period[] = [];
  let approvedStudents: StudentOnDepartment[] = [];
  let approvedStudentsKey = "";
  let allStudents: Student[] = [];
  let prices: DepartmentPrice[] = [];
  let currentUser: User | null = null;
  let selectedDepartmentId: number | null = null;
  let selectedStudentFilterId: number | null = null;
  let selectedStudentId: number | null = null;
  let selectedStudentRelationId: number | null = null;
  let selectedAdditionalStudentId: number | null = null;
  let selectedPeriodId: number | null = null;
  let selectedPriceId: number | null = null;
  let statusFilter: "ALL" | "PENDING" | "APPROVED" | "REJECTED" = "ALL";
  let startDateFilter = "";
  let endDateFilter = "";
  let showFilters = true;
  let formOpen = false;
  let formMode: "create" | "update" = "create";
  let editingId: number | null = null;
  let formName = "Horas beca";
  let formStart = "";
  let formEnd = "";
  let formAmount = 0;
  let formPrice = 0;
  let formStatus: "PENDING" | "APPROVED" | "REJECTED" = "PENDING";
  let formIsAdditional = false;
  let formManualAmount = true;
  let formDateOnly = "";
  let additionalStudentSearch = "";
  let assignedDepartmentLabel = "";
  let canViewFinancials = false;
  let canApprove = false;
  let canWrite = false;
  let headers: TableHeader[] = [];

  $: canViewFinancials = hasAnyPermission(
    currentUser,
    ["work-hours.financials.read"],
    selectedDepartmentId,
  );
  $: canApprove = hasAnyPermission(
    currentUser,
    ["work-hours.approve"],
    selectedDepartmentId,
  );
  $: canWrite = hasAnyPermission(
    currentUser,
    ["work-hours.write"],
    selectedDepartmentId,
  );

  $: headers = [
    { name: "Estudiante", field: "studentName" },
    { name: "Departamento", field: "departmentName" },
    { name: "Entrada", field: "start" },
    { name: "Salida", field: "end" },
    ...(canViewFinancials
      ? [
          { name: "Horas", field: "amount" },
          { name: "Precio", field: "price" },
          { name: "Total", field: "total" },
        ]
      : []),
    { name: "Tipo", field: "type" },
    { name: "Estado", field: "status" },
    { name: "Acciones", field: "actions" },
  ];

  function mapHoursForDisplay(hours: WorkHours) {
    return {
      ...hours,
      studentName: hours.student?.name ?? "Desconocido",
      departmentName: hours.department?.name ?? "Desconocido",
    };
  }

  function getBadgeColor(status: string) {
    if (status === "APPROVED") return "green";
    if (status === "REJECTED") return "red";
    return "yellow";
  }

  function statusLabel(status: string) {
    return STATUS_LABELS[status] ?? status;
  }

  function buildCsvValue(value: unknown) {
    if (value === null || value === undefined) return "";
    const text = String(value);
    if (text.includes(",") || text.includes("\n") || text.includes('"')) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  function exportWorkHoursCsv() {
    if (!workHours.length) {
      error = "No hay horas registradas para exportar.";
      return;
    }

    const csvHeaders = [
      "Estudiante",
      "Departamento",
      "Entrada",
      "Salida",
      ...(canViewFinancials ? ["Horas", "Precio", "Total"] : []),
      "Tipo",
      "Estado",
    ];

    const rows = workHours
      .map(mapHoursForDisplay)
      .map((row) => [
        row.studentName,
        row.departmentName,
        new Date(row.start).toLocaleString(),
        new Date(row.end).toLocaleString(),
        ...(canViewFinancials
          ? [row.amount ?? "", row.price ?? "", row.total ?? ""]
          : []),
        row.isAdditional ? "Adicional" : "Asignado",
        statusLabel(row.status),
      ]);

    const csv = [csvHeaders, ...rows]
      .map((row) => row.map(buildCsvValue).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "horas-beca.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function handlePrint() {
    if (!workHours.length) {
      error = "No hay horas registradas para imprimir.";
      return;
    }
    window.print();
  }

  async function loadWorkHours() {
    const res = await getWorkHours({
      page: pagination.page,
      departmentId: selectedDepartmentId ?? undefined,
      studentId: selectedStudentFilterId ?? undefined,
      status: statusFilter === "ALL" ? undefined : statusFilter,
      startDate: startDateFilter || undefined,
      endDate: endDateFilter || undefined,
    });

    if (!res) {
      workHours = [];
      error = "No se pudieron cargar las horas registradas.";
      return;
    }

    workHours = res.data ?? [];
    pagination.page = res.page ?? 1;
    pagination.next_page = res.next_page;
    pagination.prev_page = res.prev_page;
    error = null;
  }

  async function loadDepartments() {
    const res = await getDepartment({ page: 1, size: 200 });
    departments = res?.data ?? [];

    if (!selectedDepartmentId) {
      if (currentUser?.departmentRoles?.length) {
        selectedDepartmentId =
          currentUser.departmentRoles[0]?.departmentId ?? null;
      } else if (currentUser?.departmentId) {
        selectedDepartmentId = currentUser.departmentId;
      }
    }
  }

  async function loadPrices() {
    prices = await getDepartmentPrices();
  }

  async function loadPeriods() {
    const res = await getPeriods({ page: 1, size: 200 });
    periods = res?.data ?? [];
    if (!selectedPeriodId && periods.length) {
      const active = periods.find((p) => p.status === "ACTIVE");
      selectedPeriodId = (active ?? periods[0]).id;
    }
  }

  async function loadApprovedStudents() {
    const res = await getScholarshipRequests({
      page: 1,
      size: 200,
      departmentId: selectedDepartmentId ?? undefined,
      status: "APPROVED",
    });
    approvedStudents = res?.data ?? [];
  }

  async function loadAllStudents(search?: string) {
    const res = await getStudents({ page: 1, size: 200, search });
    allStudents = res?.data ?? [];
  }

  function resetFormState() {
    formName = "Horas beca";
    formStart = "";
    formEnd = "";
    formAmount = 0;
    formStatus = "PENDING";
    formIsAdditional = false;
    formManualAmount = true;
    formDateOnly = new Date().toISOString().slice(0, 10);
    selectedStudentId = null;
    selectedStudentRelationId = null;
    selectedAdditionalStudentId = null;
    selectedPriceId = null;
    additionalStudentSearch = "";
    assignedDepartmentLabel = "";
  }

  function setQuickHours(value: number) {
    formAmount = value;
    formManualAmount = true;
    if (!formDateOnly) {
      formDateOnly = new Date().toISOString().slice(0, 10);
    }
  }

  function openForm() {
    formMode = "create";
    editingId = null;
    formOpen = true;
    resetFormState();
    loadApprovedStudents();
  }

  function toLocalDateTimeInput(value: string | Date) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const offset = date.getTimezoneOffset();
    date.setMinutes(date.getMinutes() - offset);
    return date.toISOString().slice(0, 16);
  }

  async function openEdit(row: WorkHours) {
    if (!canWrite) return;
    formMode = "update";
    editingId = row.id;
    formOpen = true;
    formName = row.name ?? "Horas beca";
    formStart = toLocalDateTimeInput(row.start);
    formEnd = toLocalDateTimeInput(row.end);
    formDateOnly = formStart ? formStart.slice(0, 10) : "";
    formAmount = row.amount ?? 0;
    formStatus = row.status ?? "PENDING";
    formIsAdditional = row.isAdditional ?? false;
    formManualAmount = false;
    selectedStudentId = row.studentId ?? null;
    selectedDepartmentId = row.departmentId ?? selectedDepartmentId;
    selectedPeriodId = row.periodId ?? selectedPeriodId;
    selectedPriceId = (row as WorkHours & { priceId?: number }).priceId ?? null;
    selectedStudentRelationId = null;
    selectedAdditionalStudentId = row.isAdditional ? row.studentId : null;
    additionalStudentSearch = "";
    assignedDepartmentLabel = row.department?.name ?? "";
    await loadApprovedStudents();
    if (!row.isAdditional) {
      const match = approvedStudents.find(
        (item) =>
          item.studentId === Number(row.studentId) &&
          item.departmentId === Number(row.departmentId),
      );
      selectedStudentRelationId = match?.id ?? null;
    } else {
      await loadAllStudents();
    }
  }

  function calculateAmountFromTimes() {
    if (formManualAmount) return;
    if (!formStart || !formEnd) {
      formAmount = 0;
      return;
    }
    const startDate = new Date(formStart);
    const endDate = new Date(formEnd);
    const diffMs = endDate.getTime() - startDate.getTime();
    if (diffMs <= 0) {
      formAmount = 0;
      return;
    }
    formAmount = Number((diffMs / (1000 * 60 * 60)).toFixed(2));
  }

  function syncManualTimes() {
    if (!formManualAmount || !formDateOnly || !formAmount || formAmount <= 0) {
      return;
    }
    const base = new Date(`${formDateOnly}T08:00:00`);
    formStart = toLocalDateTimeInput(base);
    const end = new Date(base.getTime() + formAmount * 60 * 60 * 1000);
    formEnd = toLocalDateTimeInput(end);
  }

  async function handleSave() {
    if (!selectedDepartmentId || !selectedPeriodId) {
      error = "Selecciona departamento y periodo.";
      return;
    }

    if (formManualAmount) {
      if (!formDateOnly || !formAmount || formAmount <= 0) {
        error = "Ingresa la fecha y la cantidad de horas trabajadas.";
        return;
      }
      syncManualTimes();
    }

    if (!formStart || !formEnd || formAmount <= 0) {
      error = "Completa la hora de entrada y salida.";
      return;
    }

    const resolvedStudentId = formIsAdditional
      ? Number(selectedAdditionalStudentId)
      : Number(selectedStudentId);

    if (!resolvedStudentId) {
      error = "Selecciona un estudiante.";
      return;
    }

    const payloadStatus =
      formMode === "update" && canApprove ? formStatus : undefined;

    const payload = {
      name: formName,
      start: new Date(formStart).toISOString(),
      end: new Date(formEnd).toISOString(),
      amount: canViewFinancials ? formAmount : undefined,
      price: canViewFinancials ? formPrice : undefined,
      priceId: selectedPriceId ? Number(selectedPriceId) : undefined,
      status: payloadStatus,
      studentId: resolvedStudentId,
      departmentId: Number(selectedDepartmentId),
      periodId: Number(selectedPeriodId),
      isAdditional: formIsAdditional,
    };

    const saved =
      formMode === "update" && editingId
        ? await updateWorkHours(editingId, payload)
        : await createWorkHours(payload);

    if (!saved) {
      error =
        formMode === "update"
          ? "No se pudieron actualizar las horas."
          : "No se pudieron registrar las horas.";
      return;
    }

    formOpen = false;
    success =
      formMode === "update"
        ? "Horas actualizadas."
        : "Horas registradas como Pendiente. El jefe de departamento debe aprobarlas.";
    formMode = "create";
    editingId = null;
    await loadWorkHours();
  }

  function nextPage() {
    pagination.page = pagination.next_page ?? pagination.page;
    loadWorkHours();
  }

  function previousPage() {
    pagination.page = pagination.prev_page ?? pagination.page;
    loadWorkHours();
  }

  function clearFilters() {
    selectedStudentFilterId = null;
    statusFilter = "ALL";
    startDateFilter = "";
    endDateFilter = "";
  }

  userStore.subscribe((value) => {
    currentUser = value.dbUser ?? null;
  });

  $: departmentPrices = prices.filter(
    (p) => p.departmentId === Number(selectedDepartmentId) && p.active,
  );

  $: if (selectedDepartmentId) {
    if (selectedPriceId) {
      const match = departmentPrices.find(
        (p) => p.id === Number(selectedPriceId),
      );
      if (match) {
        formPrice = match.price;
      } else {
        selectedPriceId = null;
      }
    }
    if (!selectedPriceId) {
      const firstActive = departmentPrices[0];
      if (firstActive) {
        selectedPriceId = firstActive.id;
        formPrice = firstActive.price;
      } else {
        const currentDepartment = departments.find(
          (d) => d.id === Number(selectedDepartmentId),
        );
        formPrice = Number(currentDepartment?.pricing ?? 0);
      }
    }
  }

  $: {
    const key = `${selectedDepartmentId ?? "all"}-${currentUser?.id ?? "none"}`;
    if (key !== approvedStudentsKey) {
      approvedStudentsKey = key;
      loadApprovedStudents();
    }
  }

  $: {
    if (!formIsAdditional && selectedStudentRelationId) {
      const relation = approvedStudents.find(
        (item) => item.id === Number(selectedStudentRelationId),
      );
      if (relation) {
        selectedStudentId = relation.studentId;
        if (selectedDepartmentId !== relation.departmentId) {
          selectedDepartmentId = relation.departmentId;
        }
        assignedDepartmentLabel =
          relation.department?.name ?? `Dept ${relation.departmentId}`;
      }
    } else if (selectedDepartmentId) {
      const currentDepartment = departments.find(
        (d) => d.id === Number(selectedDepartmentId),
      );
      assignedDepartmentLabel = currentDepartment?.name ?? "";
    } else {
      assignedDepartmentLabel = "";
    }
  }

  $: if (formIsAdditional && formOpen) {
    loadAllStudents(additionalStudentSearch || undefined);
  }

  $: if (selectedDepartmentId) {
    selectedStudentFilterId;
    statusFilter;
    startDateFilter;
    endDateFilter;
    loadWorkHours();
  }

  $: if (!formManualAmount) {
    calculateAmountFromTimes();
  }

  onMount(() => {
    loadDepartments();
    loadPeriods();
    loadPrices();
    loadWorkHours();
  });
</script>

<div
  class="w-full max-w-full min-w-0 h-full px-2 sm:px-4 flex flex-col gap-3 pb-20 overflow-x-hidden"
>
  <div
    class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
  >
    <Heading tag="h3" class="mb-0">Horas Beca</Heading>
    <div class="flex flex-wrap items-center gap-2">
      {#if canWrite}
        <Button color="primary" size="sm" on:click={openForm}>
          + Registrar horas
        </Button>
      {/if}
      <Button
        size="sm"
        color="alternative"
        on:click={exportWorkHoursCsv}
        disabled={!workHours.length}>CSV</Button
      >
      <Button
        size="sm"
        color="alternative"
        on:click={handlePrint}
        disabled={!workHours.length}>Imprimir</Button
      >
      <Button
        size="sm"
        color="alternative"
        on:click={() => (showFilters = !showFilters)}
      >
        {showFilters ? "Ocultar filtros" : "Mostrar filtros"}
      </Button>
    </div>
  </div>

  {#if showFilters}
    <div class="p-3 border rounded-lg bg-gray-50 grid gap-3">
      <div
        class="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
      >
        <div>
          <Label class="text-xs text-gray-500 mb-1">Departamento</Label>
          <Select
            bind:value={selectedDepartmentId}
            on:change={() => (selectedStudentRelationId = null)}
          >
            <option value={""}>Todos</option>
            {#each departments as department}
              <option value={department.id}>{department.name}</option>
            {/each}
          </Select>
        </div>
        <div>
          <Label class="text-xs text-gray-500 mb-1">Estudiante</Label>
          <Select bind:value={selectedStudentFilterId}>
            <option value={""}>Todos</option>
            {#each approvedStudents as relation}
              <option value={relation.studentId}>
                {relation.student?.name ?? `ID ${relation.studentId}`}
              </option>
            {/each}
          </Select>
        </div>
        <div>
          <Label class="text-xs text-gray-500 mb-1">Estado</Label>
          <Select bind:value={statusFilter}>
            <option value="ALL">Todos</option>
            <option value="PENDING">Pendientes</option>
            <option value="APPROVED">Aprobadas</option>
            <option value="REJECTED">Rechazadas</option>
          </Select>
        </div>
        <div>
          <Label class="text-xs text-gray-500 mb-1">Desde</Label>
          <Input type="date" bind:value={startDateFilter} />
        </div>
        <div>
          <Label class="text-xs text-gray-500 mb-1">Hasta</Label>
          <Input type="date" bind:value={endDateFilter} />
        </div>
      </div>
      <div class="flex justify-end">
        <Button size="xs" color="alternative" on:click={clearFilters}>
          Limpiar filtros
        </Button>
      </div>
    </div>
  {/if}

  {#if error}
    <Alert color="red" dismissable>{error}</Alert>
  {/if}
  {#if success}
    <Alert color="green" dismissable>{success}</Alert>
  {/if}

  <div class="flex flex-col gap-2">
    {#if !workHours.length}
      <p class="text-sm text-gray-500 text-center py-4">
        No hay horas registradas.
      </p>
    {/if}
    {#each workHours.map(mapHoursForDisplay) as row}
      <div class="p-3 border rounded-lg bg-white flex flex-col gap-2 shadow-sm">
        <div class="flex items-start justify-between gap-2 flex-wrap">
          <div class="flex flex-col gap-0.5 min-w-0">
            <p class="font-semibold text-gray-900 break-words">
              {row.studentName}
            </p>
            <p class="text-xs text-gray-500 break-words">
              {row.departmentName}
            </p>
          </div>
          <div class="flex flex-col items-end gap-1 shrink-0">
            <Badge color={getBadgeColor(row.status)}>
              {statusLabel(row.status)}
            </Badge>
            <Badge color={row.isAdditional ? "purple" : "blue"}>
              {row.isAdditional ? "Adicional" : "Asignado"}
            </Badge>
          </div>
        </div>

        <div
          class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs text-gray-600"
        >
          <div>
            <p class="text-gray-400">Entrada</p>
            <p>
              {new Date(row.start).toLocaleString("es-CR", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </p>
          </div>
          <div>
            <p class="text-gray-400">Salida</p>
            <p>
              {new Date(row.end).toLocaleString("es-CR", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </p>
          </div>
          {#if canViewFinancials}
            <div>
              <p class="text-gray-400">Horas</p>
              <p class="font-medium">{row.amount ?? "-"}</p>
            </div>
            <div>
              <p class="text-gray-400">Precio</p>
              <p class="font-medium">
                {row.price != null
                  ? `₡${row.price?.toLocaleString?.("es-CR") ?? row.price}`
                  : "-"}
              </p>
            </div>
            <div>
              <p class="text-gray-400">Total</p>
              <p class="font-medium">
                {row.total != null
                  ? `₡${row.total?.toLocaleString?.("es-CR") ?? row.total}`
                  : "-"}
              </p>
            </div>
          {/if}
        </div>

        {#if canWrite}
          <div class="flex justify-end">
            <Button
              size="xs"
              color="alternative"
              on:click={() => openEdit(row)}
            >
              {canApprove && row.status === "PENDING" ? "Verificar" : "Editar"}
            </Button>
          </div>
        {/if}
      </div>
    {/each}
    {#if pagination.prev_page || pagination.next_page}
      <div class="flex justify-between pt-2">
        <Button
          size="xs"
          color="alternative"
          disabled={!pagination.prev_page}
          on:click={previousPage}>Anterior</Button
        >
        <Button
          size="xs"
          color="alternative"
          disabled={!pagination.next_page}
          on:click={nextPage}>Siguiente</Button
        >
      </div>
    {/if}
  </div>
</div>

<Modal
  title={formMode === "update" ? "Editar horas beca" : "Registrar horas beca"}
  bind:open={formOpen}
  outsideclose
  size="md"
>
  <div class="grid gap-4 max-w-full">
    <div class="grid sm:grid-cols-2 gap-3">
      <div>
        <Label class="mb-1">Departamento</Label>
        <Select
          bind:value={selectedDepartmentId}
          on:change={() => {
            selectedStudentRelationId = null;
            selectedPriceId = null;
          }}
        >
          <option value={""}>Selecciona un departamento</option>
          {#each departments as department}
            <option value={department.id}>{department.name}</option>
          {/each}
        </Select>
      </div>
      <div>
        <Label class="mb-1">Periodo</Label>
        <Select bind:value={selectedPeriodId}>
          <option value={""}>Selecciona un periodo</option>
          {#each periods as period}
            <option value={period.id}>{period.name}</option>
          {/each}
        </Select>
      </div>
    </div>

    <div class="flex items-start gap-2 p-2 bg-gray-50 rounded">
      <Checkbox bind:checked={formIsAdditional} class="mt-1" />
      <div class="flex flex-col gap-0.5">
        <p class="text-sm font-medium">Estudiante adicional</p>
        <p class="text-xs text-gray-500">
          Actívalo cuando registres horas para alguien que no está asignado a
          este departamento.
        </p>
      </div>
    </div>

    {#if formIsAdditional}
      <div>
        <Label class="mb-1">Buscar estudiante</Label>
        <Input
          bind:value={additionalStudentSearch}
          placeholder="Nombre o carnet"
          on:input={() => loadAllStudents(additionalStudentSearch || undefined)}
        />
      </div>
      <div>
        <Label class="mb-1">Estudiante adicional</Label>
        <Select bind:value={selectedAdditionalStudentId}>
          <option value={""}>Selecciona un estudiante</option>
          {#each allStudents as student}
            <option value={student.id}>
              {student.name} - {student.code}
            </option>
          {/each}
        </Select>
      </div>
    {:else}
      <div>
        <Label class="mb-1">Estudiante asignado</Label>
        <Select bind:value={selectedStudentRelationId}>
          <option value={""}>Selecciona un estudiante aprobado</option>
          {#each approvedStudents as relation}
            <option value={relation.id}>
              {relation.student?.name ?? `ID ${relation.studentId}`} -
              {relation.department?.name ?? `Dept ${relation.departmentId}`}
            </option>
          {/each}
        </Select>
        <p class="text-xs text-gray-400 mt-1">
          Solo se muestran estudiantes aprobados en {assignedDepartmentLabel ||
            "este departamento"}.
        </p>
      </div>
    {/if}

    <div>
      <Label class="mb-1">Descripción</Label>
      <Input
        bind:value={formName}
        placeholder="Ej: Tutoría matemática, Laboratorio..."
      />
    </div>

    {#if departmentPrices.length}
      <div>
        <Label class="mb-1">Precio aplicado</Label>
        <Select bind:value={selectedPriceId}>
          {#each departmentPrices as price}
            <option value={price.id}>
              {price.label} - ₡{price.price.toLocaleString("es-CR")}
            </option>
          {/each}
        </Select>
        <p class="text-xs text-gray-400 mt-1">
          Selecciona el precio que aplica para este registro de horas.
        </p>
      </div>
    {/if}

    <div class="p-3 border rounded-lg grid gap-3 bg-gray-50">
      <div class="flex items-center justify-between gap-2">
        <div>
          <p class="text-sm font-medium">
            {formManualAmount
              ? "Registro rápido por día"
              : "Registro por hora exacta"}
          </p>
          <p class="text-xs text-gray-500">
            {formManualAmount
              ? "Solo escoges fecha y cuántas horas trabajaste. Pensado para móviles."
              : "Escoges hora exacta de entrada y salida. Útil desde computadora."}
          </p>
        </div>
        <Toggle bind:checked={formManualAmount} />
      </div>

      {#if formManualAmount}
        <div class="grid gap-3">
          <div>
            <Label class="mb-1 text-sm font-medium">Fecha del trabajo</Label>
            <Input type="date" bind:value={formDateOnly} class="text-base" />
          </div>
          <div>
            <Label class="mb-1 text-sm font-medium">Horas trabajadas</Label>
            <Input
              type="number"
              min="0"
              step="0.25"
              bind:value={formAmount}
              placeholder="Ej: 2.5"
              class="text-base"
            />
            <div class="flex flex-wrap gap-2 mt-2">
              {#each [1, 2, 3, 4, 6, 8] as quickValue}
                <Button
                  size="xs"
                  color={formAmount === quickValue ? "primary" : "alternative"}
                  on:click={() => setQuickHours(quickValue)}
                >
                  {quickValue}h
                </Button>
              {/each}
            </div>
          </div>
        </div>
      {:else}
        <div class="grid sm:grid-cols-2 gap-3">
          <div>
            <Label class="mb-1 text-sm font-medium">Hora entrada</Label>
            <Input
              type="datetime-local"
              bind:value={formStart}
              class="text-base"
            />
          </div>
          <div>
            <Label class="mb-1 text-sm font-medium">Hora salida</Label>
            <Input
              type="datetime-local"
              bind:value={formEnd}
              class="text-base"
            />
          </div>
        </div>
      {/if}
    </div>

    {#if canViewFinancials}
      <div class="grid sm:grid-cols-2 gap-3">
        <div>
          <Label class="mb-1">Horas calculadas</Label>
          <Input value={formAmount} readonly />
        </div>
        <div>
          <Label class="mb-1">Precio por hora</Label>
          <Input type="number" value={formPrice} min="0" step="0.01" readonly />
        </div>
      </div>
    {/if}

    {#if formMode === "update" && canApprove}
      <div class="p-3 bg-blue-50 border border-blue-200 rounded grid gap-2">
        <p class="text-sm font-medium text-blue-900">
          Verificación del jefe de departamento
        </p>
        <Select bind:value={formStatus}>
          <option value="PENDING">Dejar como pendiente</option>
          <option value="APPROVED">Aprobar</option>
          <option value="REJECTED">Rechazar</option>
        </Select>
        <p class="text-xs text-blue-800">
          Al aprobar, las horas quedan firmes en el periodo.
        </p>
      </div>
    {:else if formMode === "create"}
      <Alert color="yellow">
        Las horas se registran automáticamente como <b>Pendiente</b>. Solo el
        jefe del departamento puede aprobarlas para que entren al periodo.
      </Alert>
    {/if}
  </div>

  <svelte:fragment slot="footer">
    <Button color="primary" on:click={handleSave}>
      {formMode === "update" ? "Guardar cambios" : "Registrar"}
    </Button>
    <Button color="alternative" on:click={() => (formOpen = false)}
      >Cerrar</Button
    >
  </svelte:fragment>
</Modal>
