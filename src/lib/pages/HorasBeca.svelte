<script lang="ts">
  import {
    Alert,
    Badge,
    Button,
    Heading,
    Input,
    Modal,
    Select,
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
  import { hasAnyPermission } from "$lib/utils/permissions";
  import { userStore } from "../../stores/user.store";
  import type {
    Department,
    Period,
    StudentOnDepartment,
    TableHeader,
    TablePagination,
    User,
    WorkHours,
  } from "$lib/types";

  let workHours: WorkHours[] = [];
  let error: string | null = null;
  let pagination: TablePagination = { page: 1 };
  let departments: Department[] = [];
  let periods: Period[] = [];
  let approvedStudents: StudentOnDepartment[] = [];
  let approvedStudentsKey = "";
  let currentUser: User | null = null;
  let selectedDepartmentId: number | null = null;
  let selectedStudentFilterId: number | null = null;
  let selectedStudentId: number | null = null;
  let selectedStudentRelationId: number | null = null;
  let selectedPeriodId: number | null = null;
  let statusFilter: "ALL" | "PENDING" | "APPROVED" | "REJECTED" = "ALL";
  let startDateFilter = "";
  let endDateFilter = "";
  let formOpen = false;
  let formMode: "create" | "update" = "create";
  let editingId: number | null = null;
  let formName = "Horas beca";
  let formStart = "";
  let formEnd = "";
  let formAmount = 0;
  let formPrice = 0;
  let formStatus: "PENDING" | "APPROVED" | "REJECTED" = "PENDING";
  let assignedDepartmentLabel = "";
  let canViewFinancials = false;
  let canApprove = false;
  let canWrite = false;
  let headers: TableHeader[] = [];

  $: canViewFinancials = hasAnyPermission(currentUser, [
    "work-hours.financials.read",
  ]);
  $: canApprove = hasAnyPermission(currentUser, ["work-hours.approve"]);
  $: canWrite = hasAnyPermission(currentUser, ["work-hours.write"]);

  $: headers = [
    { name: "Estudiante", field: "studentName" },
    { name: "Departamento", field: "departmentName" },
    { name: "Entrada", field: "start" },
    { name: "Salida", field: "end" },
    ...(canViewFinancials
      ? [
          { name: "Horas registradas", field: "amount" },
          { name: "Precio unitario", field: "price" },
          { name: "Total", field: "total" },
        ]
      : []),
    { name: "Estado", field: "status" },
    { name: "Acciones", field: "actions" },
  ];

  function mapHoursForDisplay(hours: WorkHours) {
    return {
      ...hours,
      studentName: hours.student?.name ?? "Unknown",
      departmentName: hours.department?.name ?? "Unknown",
    };
  }

  function getBadgeColor(status: string) {
    if (status === "APPROVED") {
      return "green";
    }
    if (status === "REJECTED") {
      return "red";
    }
    return "yellow";
  }

  function buildCsvValue(value: unknown) {
    if (value === null || value === undefined) {
      return "";
    }
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

    const headers = [
      "Estudiante",
      "Departamento",
      "Entrada",
      "Salida",
      ...(canViewFinancials ? ["Horas", "Precio", "Total"] : []),
      "Estado",
    ];

    const rows = workHours.map(mapHoursForDisplay).map((row) => [
      row.studentName,
      row.departmentName,
      new Date(row.start).toLocaleString(),
      new Date(row.end).toLocaleString(),
      ...(canViewFinancials
        ? [row.amount ?? "", row.price ?? "", row.total ?? ""]
        : []),
      row.status,
    ]);

    const csv = [headers, ...rows]
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

    if (!selectedDepartmentId && currentUser?.departmentId) {
      selectedDepartmentId = currentUser.departmentId;
    }
  }

  async function loadPeriods() {
    const res = await getPeriods({ page: 1, size: 200 });
    periods = res?.data ?? [];
    if (!selectedPeriodId && periods.length) {
      selectedPeriodId = periods[0].id;
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

  function openForm() {
    formMode = "create";
    editingId = null;
    formOpen = true;
    formName = "Horas beca";
    formStart = "";
    formEnd = "";
    formAmount = 0;
    formPrice = 0;
    formStatus = "PENDING";
    selectedStudentId = null;
    selectedStudentRelationId = null;
    assignedDepartmentLabel = "";
    loadApprovedStudents();
  }

  function toLocalDateTimeInput(value: string | Date) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    const offset = date.getTimezoneOffset();
    date.setMinutes(date.getMinutes() - offset);
    return date.toISOString().slice(0, 16);
  }

  async function openEdit(row: WorkHours) {
    if (!canWrite) {
      return;
    }
    formMode = "update";
    editingId = row.id;
    formOpen = true;
    formName = row.name ?? "Horas beca";
    formStart = toLocalDateTimeInput(row.start);
    formEnd = toLocalDateTimeInput(row.end);
    formStatus = row.status ?? "PENDING";
    selectedStudentId = row.studentId ?? null;
    selectedDepartmentId = row.departmentId ?? selectedDepartmentId;
    selectedPeriodId = row.periodId ?? selectedPeriodId;
    selectedStudentRelationId = null;
    assignedDepartmentLabel = row.department?.name ?? "";
    await loadApprovedStudents();
    const match = approvedStudents.find(
      (item) =>
        item.studentId === Number(row.studentId) &&
        item.departmentId === Number(row.departmentId),
    );
    selectedStudentRelationId = match?.id ?? null;
  }

  function calculateAmount() {
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

  async function handleSave() {
    if (!selectedDepartmentId || !selectedStudentId || !selectedPeriodId) {
      error = "Selecciona departamento, estudiante y periodo.";
      return;
    }

    if (!formStart || !formEnd || formAmount <= 0) {
      error = "Completa la hora de entrada y salida.";
      return;
    }

    if (canViewFinancials && formPrice <= 0) {
      error = "Completa el precio por hora.";
      return;
    }

    const payload = {
      name: formName,
      start: new Date(formStart).toISOString(),
      end: new Date(formEnd).toISOString(),
      amount: canViewFinancials ? formAmount : undefined,
      price: canViewFinancials ? formPrice : undefined,
      status: canApprove ? formStatus : undefined,
      studentId: Number(selectedStudentId),
      departmentId: Number(selectedDepartmentId),
      periodId: Number(selectedPeriodId),
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

  userStore.subscribe((value) => {
    currentUser = value.dbUser ?? null;
  });

  $: if (selectedDepartmentId) {
    const currentDepartment = departments.find(
      (department) => department.id === Number(selectedDepartmentId),
    );
    formPrice = Number(currentDepartment?.pricing ?? 0);
  }

  $: {
    const key = `${selectedDepartmentId ?? "all"}-${currentUser?.id ?? "none"}`;
    if (key !== approvedStudentsKey) {
      approvedStudentsKey = key;
      loadApprovedStudents();
    }
  }

  $: {
    if (selectedStudentRelationId) {
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
        (department) => department.id === Number(selectedDepartmentId),
      );
      assignedDepartmentLabel = currentDepartment?.name ?? "";
    } else {
      assignedDepartmentLabel = "";
    }
  }

  $: if (!canApprove && formStatus !== "PENDING") {
    formStatus = "PENDING";
  }

  $: if (selectedDepartmentId) {
    selectedStudentFilterId;
    statusFilter;
    startDateFilter;
    endDateFilter;
    loadWorkHours();
  }

  $: calculateAmount();

  onMount(() => {
    loadDepartments();
    loadPeriods();
    loadWorkHours();
  });
</script>

<div class="w-full h-full px-4 grid gap-3">
  <Heading tag="h3" class="mb-2">Horas de Beca Registradas</Heading>

  <div class="grid md:grid-cols-2 xl:grid-cols-6 gap-3">
    <div>
      <p class="text-sm text-gray-500">Departamento</p>
      <Select
        bind:value={selectedDepartmentId}
        on:change={() => (selectedStudentRelationId = null)}
      >
        <option value={""}>Selecciona un departamento</option>
        {#each departments as department}
          <option value={department.id}>{department.name}</option>
        {/each}
      </Select>
    </div>
    <div>
      <p class="text-sm text-gray-500">Estudiante</p>
      <Select bind:value={selectedStudentFilterId}>
        <option value={""}>Todos</option>
        {#each approvedStudents as relation}
          <option value={relation.studentId}>
            {relation.student?.name ?? `ID ${relation.studentId}`} -
            {relation.department?.name ?? `Dept ${relation.departmentId}`}
          </option>
        {/each}
      </Select>
    </div>
    <div>
      <p class="text-sm text-gray-500">Estado</p>
      <Select bind:value={statusFilter}>
        <option value="ALL">Todos</option>
        <option value="PENDING">PENDING</option>
        <option value="APPROVED">APPROVED</option>
        <option value="REJECTED">REJECTED</option>
      </Select>
    </div>
    <div>
      <p class="text-sm text-gray-500">Desde</p>
      <Input type="date" bind:value={startDateFilter} />
    </div>
    <div>
      <p class="text-sm text-gray-500">Hasta</p>
      <Input type="date" bind:value={endDateFilter} />
    </div>
    <div class="flex items-end gap-2 flex-wrap">
      {#if canWrite}
        <Button color="primary" on:click={openForm}>Registrar horas</Button>
      {/if}
      <Button
        color="alternative"
        on:click={exportWorkHoursCsv}
        disabled={!workHours.length}
        >Exportar CSV</Button
      >
      <Button color="alternative" on:click={handlePrint} disabled={!workHours.length}
        >Imprimir</Button
      >
    </div>
  </div>

  {#if error}
    <Alert type="error" dismissable>{error}</Alert>
  {/if}

  <Table
    data={workHours.map(mapHoursForDisplay)}
    {headers}
    {pagination}
    on:next={nextPage}
    on:previous={previousPage}
  >
    <svelte:fragment slot="row" let:row>
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        {row.studentName}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
        {row.departmentName}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
        {new Date(row.start).toLocaleString()}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
        {new Date(row.end).toLocaleString()}
      </td>
      {#if canViewFinancials}
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
          {row.amount ?? "-"}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
          {row.price != null
            ? `RD$ ${row.price?.toLocaleString?.("es-DO") ?? row.price}`
            : "-"}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
          {row.total != null
            ? `RD$ ${row.total?.toLocaleString?.("es-DO") ?? row.total}`
            : "-"}
        </td>
      {/if}
      <td class="px-6 py-4 whitespace-nowrap text-sm">
        <Badge color={getBadgeColor(row.status)}>
          {row.status}
        </Badge>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm">
        {#if canWrite}
          <Button size="xs" color="alternative" on:click={() => openEdit(row)}>
            Editar
          </Button>
        {:else}
          -
        {/if}
      </td>
    </svelte:fragment>
  </Table>
</div>

<Modal
  title={formMode === "update" ? "Editar horas beca" : "Registrar horas beca"}
  bind:open={formOpen}
  outsideclose
>
  <div class="grid gap-3">
    <div>
      <p class="text-sm text-gray-500">Departamento</p>
      <Select
        bind:value={selectedDepartmentId}
        on:change={() => (selectedStudentRelationId = null)}
      >
        <option value={""}>Selecciona un departamento</option>
        {#each departments as department}
          <option value={department.id}>{department.name}</option>
        {/each}
      </Select>
    </div>
    <div>
      <p class="text-sm text-gray-500">Estudiante</p>
      <Select bind:value={selectedStudentRelationId}>
        <option value={""}>Selecciona un estudiante</option>
        {#each approvedStudents as relation}
          <option value={relation.id}>
            {relation.student?.name ?? `ID ${relation.studentId}`} -
            {relation.department?.name ?? `Dept ${relation.departmentId}`}
          </option>
        {/each}
      </Select>
    </div>
    <div>
      <p class="text-sm text-gray-500">Departamento asignado</p>
      <Input value={assignedDepartmentLabel || "-"} readonly />
    </div>
    <div>
      <p class="text-sm text-gray-500">Periodo</p>
      <Select bind:value={selectedPeriodId}>
        <option value={""}>Selecciona un periodo</option>
        {#each periods as period}
          <option value={period.id}>{period.name}</option>
        {/each}
      </Select>
    </div>
    <div>
      <p class="text-sm text-gray-500">Nombre</p>
      <Input bind:value={formName} placeholder="Horas beca" />
    </div>
    <div>
      <p class="text-sm text-gray-500">Hora entrada</p>
      <Input type="datetime-local" bind:value={formStart} />
    </div>
    <div>
      <p class="text-sm text-gray-500">Hora salida</p>
      <Input type="datetime-local" bind:value={formEnd} />
    </div>
    {#if canViewFinancials}
      <div>
        <p class="text-sm text-gray-500">Horas calculadas</p>
        <Input bind:value={formAmount} readonly />
      </div>
      <div>
        <p class="text-sm text-gray-500">Precio por hora</p>
        <Input type="number" bind:value={formPrice} min="0" step="0.01" readonly />
      </div>
    {/if}
    {#if canApprove}
      <div>
        <p class="text-sm text-gray-500">Estado</p>
        <Select bind:value={formStatus}>
          <option value="PENDING">PENDING</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
        </Select>
      </div>
    {/if}
  </div>

  <svelte:fragment slot="footer">
    <Button color="primary" on:click={handleSave}>
      {formMode === "update" ? "Actualizar" : "Guardar"}
    </Button>
    <Button color="alternative" on:click={() => (formOpen = false)}>Cerrar</Button>
  </svelte:fragment>
</Modal>
