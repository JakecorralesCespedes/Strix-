<script lang="ts">
  import {
    Alert,
    Badge,
    Button,
    Heading,
    Input,
    Modal,
    Select,
    TableBodyCell,
    TableBodyRow,
  } from "flowbite-svelte";
  import { onMount } from "svelte";
  import Table from "$lib/components/Table.svelte";
  import {
    createScholarshipRequest,
    getScholarshipRequests,
    updateScholarshipRequest,
  } from "$lib/services/scholarship-request.service";
  import { getDepartment } from "$lib/services/department.service";
  import { getStudents } from "$lib/services/student.service";
  import type {
    Department,
    Student,
    StudentOnDepartment,
    TableHeader,
    TablePagination,
  } from "$lib/types";

  let requests: StudentOnDepartment[] = [];
  let error: string | null = null;
  let pagination: TablePagination = { page: 1 };
  let selectedRequest: StudentOnDepartment | null = null;
  let detailsOpen = false;
  let departmentOptions: Department[] = [];
  let editDepartmentId: number | null = null;
  let editStatus: string = "PENDING";
  let filterDepartmentId: number | null = null;
  let filterStatus: "ALL" | "PENDING" | "APPROVED" | "REJECTED" = "ALL";
  let createOpen = false;
  let createDepartmentId: number | null = null;
  let createStudentId: number | null = null;
  let createStatus: "PENDING" | "APPROVED" | "REJECTED" = "PENDING";
  let studentSearch = "";
  let studentOptions: Student[] = [];
  let studentLoading = false;

  const headers: TableHeader[] = [
    { name: "ID", field: "id" },
    { name: "Estudiante", field: "student" },
    { name: "Departamento", field: "department" },
    { name: "Estado", field: "status" },
    { name: "Acciones", field: "actions" },
  ];

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

  function exportRequestsCsv() {
    if (!requests.length) {
      error = "No hay solicitudes para exportar.";
      return;
    }

    const headers = ["ID", "Estudiante", "Email", "Departamento", "Estado"];
    const rows = requests.map((request) => [
      request.id,
      request.student?.name ?? "-",
      request.student?.email ?? "-",
      request.department?.name ?? "-",
      request.status,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(buildCsvValue).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "solicitudes-beca.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function loadRequests() {
    const res = await getScholarshipRequests({
      page: pagination.page,
      departmentId: filterDepartmentId ?? undefined,
      status: filterStatus === "ALL" ? undefined : filterStatus,
    });

    if (!res) {
      requests = [];
      error = "No se pudieron cargar las solicitudes.";
      return;
    }

    requests = res.data ?? [];
    pagination.page = res.page ?? 1;
    pagination.next_page = res.next_page;
    pagination.prev_page = res.prev_page;
    error = null;
  }

  async function loadDepartments() {
    const res = await getDepartment({ page: 1, size: 200 });
    departmentOptions = res?.data ?? [];

    if (!filterDepartmentId && departmentOptions.length === 1) {
      filterDepartmentId = departmentOptions[0]?.id ?? null;
    }
  }

  async function loadStudents() {
    studentLoading = true;
    const res = await getStudents({
      page: 1,
      size: 200,
      search: studentSearch.trim() || undefined,
    });
    studentOptions = res?.data ?? [];
    studentLoading = false;
  }

  function openCreate() {
    createDepartmentId = filterDepartmentId ?? departmentOptions[0]?.id ?? null;
    createStudentId = null;
    createStatus = "PENDING";
    studentSearch = "";
    studentOptions = [];
    createOpen = true;
    loadStudents();
  }

  async function handleCreate() {
    if (!createDepartmentId || !createStudentId) {
      error = "Selecciona departamento y estudiante.";
      return;
    }

    const created = await createScholarshipRequest({
      departmentId: Number(createDepartmentId),
      studentId: Number(createStudentId),
      status: createStatus,
    });

    if (!created) {
      error = "No se pudo crear la solicitud.";
      return;
    }

    createOpen = false;
    await loadRequests();
  }

  function handleFilterChange() {
    pagination.page = 1;
    loadRequests();
  }

  function handleStudentSearch() {
    loadStudents();
  }

  function nextPage() {
    pagination.page = pagination.next_page ?? pagination.page;
    loadRequests();
  }

  function previousPage() {
    pagination.page = pagination.prev_page ?? pagination.page;
    loadRequests();
  }

  function openDetails(request: StudentOnDepartment) {
    selectedRequest = request;
    editDepartmentId = request.departmentId;
    editStatus = request.status;
    detailsOpen = true;
  }

  async function handleSave() {
    if (!selectedRequest) return;

    const departmentId = editDepartmentId
      ? Number(editDepartmentId)
      : undefined;

    const updated = await updateScholarshipRequest(selectedRequest.id, {
      status: editStatus as "PENDING" | "APPROVED" | "REJECTED",
      departmentId,
    });

    if (!updated) {
      error = "No se pudo actualizar la solicitud.";
      return;
    }

    detailsOpen = false;
    await loadRequests();
  }

  onMount(() => {
    loadRequests();
    loadDepartments();
  });
</script>

<div class="w-full h-full px-4 grid gap-3">
  <div class="flex items-center justify-between">
    <Heading tag="h3" class="mb-2">Solicitudes de Beca</Heading>
    <div class="flex items-center gap-2">
      <Button size="sm" color="primary" on:click={openCreate}
        >Nueva solicitud</Button
      >
      <Button
        size="sm"
        color="alternative"
        on:click={exportRequestsCsv}
        disabled={!requests.length}
        >Exportar CSV</Button
      >
    </div>
  </div>

  <div class="grid md:grid-cols-2 gap-3">
    <div>
      <p class="text-sm text-gray-500">Departamento</p>
      <Select bind:value={filterDepartmentId} on:change={handleFilterChange}>
        <option value={""}>Todos</option>
        {#each departmentOptions as department}
          <option value={department.id}>{department.name}</option>
        {/each}
      </Select>
    </div>
    <div>
      <p class="text-sm text-gray-500">Estado</p>
      <Select bind:value={filterStatus} on:change={handleFilterChange}>
        <option value="ALL">Todos</option>
        <option value="PENDING">PENDING</option>
        <option value="APPROVED">APPROVED</option>
        <option value="REJECTED">REJECTED</option>
      </Select>
    </div>
  </div>

  {#if error}
    <Alert type="error" dismissable>{error}</Alert>
  {/if}

  <Table data={requests} headers={headers} {pagination} on:next={nextPage} on:previous={previousPage}>
    <TableBodyRow slot="row" let:row>
      <TableBodyCell>{row.id}</TableBodyCell>
      <TableBodyCell>{row.student?.name ?? "-"}</TableBodyCell>
      <TableBodyCell>{row.department?.name ?? "-"}</TableBodyCell>
      <TableBodyCell>
        <Badge color={getBadgeColor(row.status)}>{row.status}</Badge>
      </TableBodyCell>
      <TableBodyCell>
        <Button size="xs" color="alternative" on:click={() => openDetails(row)}>
          Editar
        </Button>
      </TableBodyCell>
    </TableBodyRow>
  </Table>
</div>

<Modal title="Detalles de Solicitud" bind:open={detailsOpen} outsideclose>
  {#if selectedRequest}
    <div class="grid gap-3">
      <div>
        <p class="text-sm text-gray-500">Estudiante</p>
        <p class="font-medium">{selectedRequest.student?.name ?? "Unknown"}</p>
      </div>
      <div>
        <p class="text-sm text-gray-500">Email</p>
        <p class="font-medium">{selectedRequest.student?.email ?? "-"}</p>
      </div>
      <div>
        <p class="text-sm text-gray-500">Código</p>
        <p class="font-medium">{selectedRequest.student?.code ?? "-"}</p>
      </div>
      <div>
        <p class="text-sm text-gray-500">Departamento</p>
        <Select bind:value={editDepartmentId}>
          <option value={""}>Selecciona un departamento</option>
          {#each departmentOptions as department}
            <option value={department.id}>{department.name}</option>
          {/each}
        </Select>
      </div>
      <div>
        <p class="text-sm text-gray-500">Teléfono</p>
        <p class="font-medium">{selectedRequest.student?.phone ?? "-"}</p>
      </div>
      <div>
        <p class="text-sm text-gray-500">Estado</p>
        <Select bind:value={editStatus}>
          <option value="PENDING">PENDING</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
        </Select>
      </div>
    </div>
  {/if}

  <svelte:fragment slot="footer">
    <Button color="primary" on:click={handleSave}>Guardar cambios</Button>
    <Button color="alternative" on:click={() => (detailsOpen = false)}>
      Cerrar
    </Button>
  </svelte:fragment>
</Modal>

<Modal title="Crear solicitud de beca" bind:open={createOpen} outsideclose>
  <div class="grid gap-3">
    <div>
      <p class="text-sm text-gray-500">Departamento</p>
      <Select bind:value={createDepartmentId}>
        <option value={""}>Selecciona un departamento</option>
        {#each departmentOptions as department}
          <option value={department.id}>{department.name}</option>
        {/each}
      </Select>
    </div>
    <div>
      <p class="text-sm text-gray-500">Buscar estudiante</p>
      <div class="flex gap-2">
        <Input
          bind:value={studentSearch}
          placeholder="Nombre o carnet"
          on:keydown={(event) => event.key === "Enter" && handleStudentSearch()}
        />
        <Button size="sm" color="alternative" on:click={handleStudentSearch}
          >Buscar</Button
        >
      </div>
    </div>
    <div>
      <p class="text-sm text-gray-500">Estudiante</p>
      <Select bind:value={createStudentId}>
        <option value={""}>
          {studentLoading ? "Cargando..." : "Selecciona un estudiante"}
        </option>
        {#each studentOptions as student}
          <option value={student.id}>
            {student.name ?? "-"} - {student.code ?? student.id}
          </option>
        {/each}
      </Select>
    </div>
    <div>
      <p class="text-sm text-gray-500">Estado</p>
      <Select bind:value={createStatus}>
        <option value="PENDING">PENDING</option>
        <option value="APPROVED">APPROVED</option>
        <option value="REJECTED">REJECTED</option>
      </Select>
    </div>
  </div>

  <svelte:fragment slot="footer">
    <Button color="primary" on:click={handleCreate}>Crear</Button>
    <Button color="alternative" on:click={() => (createOpen = false)}>
      Cerrar
    </Button>
  </svelte:fragment>
</Modal>


