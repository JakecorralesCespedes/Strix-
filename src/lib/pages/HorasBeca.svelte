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
  } from "$lib/services/work-hours.service";
  import { getDepartment } from "$lib/services/department.service";
  import { getPeriods } from "$lib/services/period.service";
  import { getScholarshipRequests } from "$lib/services/scholarship-request.service";
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
  let currentUser: User | null = null;
  let selectedDepartmentId: number | null = null;
  let selectedStudentId: number | null = null;
  let selectedPeriodId: number | null = null;
  let formOpen = false;
  let formName = "Horas beca";
  let formStart = "";
  let formEnd = "";
  let formAmount = 0;
  let formPrice = 0;
  let formStatus: "PENDING" | "APPROVED" | "REJECTED" = "PENDING";

  const headers: TableHeader[] = [
    { name: "Estudiante", field: "studentName" },
    { name: "Departamento", field: "departmentName" },
    { name: "Entrada", field: "start" },
    { name: "Salida", field: "end" },
    { name: "Horas registradas", field: "amount" },
    { name: "Precio unitario", field: "price" },
    { name: "Total", field: "total" },
    { name: "Estado", field: "status" },
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

  async function loadWorkHours() {
    const res = await getWorkHours({
      page: pagination.page,
      departmentId: selectedDepartmentId ?? undefined,
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
    if (!selectedDepartmentId) {
      approvedStudents = [];
      return;
    }

    const res = await getScholarshipRequests({
      page: 1,
      size: 200,
      departmentId: selectedDepartmentId,
      status: "APPROVED",
    });

    approvedStudents = res?.data ?? [];
  }

  function openForm() {
    formOpen = true;
    formName = "Horas beca";
    formStart = "";
    formEnd = "";
    formAmount = 0;
    formPrice = 0;
    formStatus = "PENDING";
    selectedStudentId = null;
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

    if (!formStart || !formEnd || formAmount <= 0 || formPrice <= 0) {
      error = "Completa la hora de entrada/salida y el precio.";
      return;
    }

    const created = await createWorkHours({
      name: formName,
      start: new Date(formStart).toISOString(),
      end: new Date(formEnd).toISOString(),
      amount: formAmount,
      price: formPrice,
      status: formStatus,
      studentId: Number(selectedStudentId),
      departmentId: Number(selectedDepartmentId),
      periodId: Number(selectedPeriodId),
    });

    if (!created) {
      error = "No se pudieron registrar las horas.";
      return;
    }

    formOpen = false;
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
    loadApprovedStudents();
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

  <div class="grid md:grid-cols-3 gap-3">
    <div>
      <p class="text-sm text-gray-500">Departamento</p>
      <Select bind:value={selectedDepartmentId}>
        <option value={""}>Selecciona un departamento</option>
        {#each departments as department}
          <option value={department.id}>{department.name}</option>
        {/each}
      </Select>
    </div>
    <div class="flex items-end">
      <Button color="primary" on:click={openForm}>Registrar horas</Button>
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
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
        {row.amount}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
        RD$ {row.price?.toLocaleString?.("es-DO") ?? row.price}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        RD$ {row.total?.toLocaleString?.("es-DO") ?? row.total}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm">
        <Badge color={getBadgeColor(row.status)}>
          {row.status}
        </Badge>
      </td>
    </svelte:fragment>
  </Table>
</div>

<Modal title="Registrar horas beca" bind:open={formOpen} outsideclose>
  <div class="grid gap-3">
    <div>
      <p class="text-sm text-gray-500">Departamento</p>
      <Select bind:value={selectedDepartmentId}>
        <option value={""}>Selecciona un departamento</option>
        {#each departments as department}
          <option value={department.id}>{department.name}</option>
        {/each}
      </Select>
    </div>
    <div>
      <p class="text-sm text-gray-500">Estudiante</p>
      <Select bind:value={selectedStudentId}>
        <option value={""}>Selecciona un estudiante</option>
        {#each approvedStudents as relation}
          <option value={relation.studentId}>
            {relation.student?.name ?? `ID ${relation.studentId}`}
          </option>
        {/each}
      </Select>
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
    <div>
      <p class="text-sm text-gray-500">Horas calculadas</p>
      <Input bind:value={formAmount} readonly />
    </div>
    <div>
      <p class="text-sm text-gray-500">Precio por hora</p>
      <Input type="number" bind:value={formPrice} min="0" step="0.01" />
    </div>
    <div>
      <p class="text-sm text-gray-500">Estado</p>
      <Select bind:value={formStatus}>
        <option value="PENDING">PENDING</option>
        <option value="APPROVED">APPROVED</option>
        <option value="REJECTED">REJECTED</option>
      </Select>
    </div>
  </div>

  <svelte:fragment slot="footer">
    <Button color="primary" on:click={handleSave}>Guardar</Button>
    <Button color="alternative" on:click={() => (formOpen = false)}>Cerrar</Button>
  </svelte:fragment>
</Modal>
