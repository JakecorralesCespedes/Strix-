<script lang="ts">
  import {
    Alert,
    Badge,
    Button,
    Heading,
    Modal,
    Select,
    TableBodyCell,
    TableBodyRow,
  } from "flowbite-svelte";
  import { onMount } from "svelte";
  import Table from "$lib/components/Table.svelte";
  import {
    getScholarshipRequests,
    updateScholarshipRequest,
  } from "$lib/services/scholarship-request.service";
  import { getDepartment } from "$lib/services/department.service";
  import type { Department, StudentOnDepartment, TableHeader, TablePagination } from "$lib/types";

  let requests: StudentOnDepartment[] = [];
  let error: string | null = null;
  let pagination: TablePagination = { page: 1 };
  let selectedRequest: StudentOnDepartment | null = null;
  let detailsOpen = false;
  let departmentOptions: Department[] = [];
  let selectedDepartmentId: number | null = null;
  let selectedStatus: string = "PENDING";

  const headers: TableHeader[] = [
    { name: "ID", field: "id" },
    { name: "Estudiante", field: "student" },
    { name: "Departamento", field: "department" },
    { name: "Estado", field: "status" },
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
    const res = await getScholarshipRequests({ page: pagination.page });

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
    selectedDepartmentId = request.departmentId;
    selectedStatus = request.status;
    detailsOpen = true;
  }

  async function handleSave() {
    if (!selectedRequest) return;

    const departmentId = selectedDepartmentId
      ? Number(selectedDepartmentId)
      : undefined;

    const updated = await updateScholarshipRequest(selectedRequest.id, {
      status: selectedStatus as "PENDING" | "APPROVED" | "REJECTED",
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
    <Button
      size="sm"
      color="alternative"
      on:click={exportRequestsCsv}
      disabled={!requests.length}
      >Exportar CSV</Button
    >
  </div>

  {#if error}
    <Alert type="error" dismissable>{error}</Alert>
  {/if}

  <Table
    data={requests}
    headers={headers}
    {pagination}
    on:next={nextPage}
    on:previous={previousPage}
    on:rowClick={(event) => openDetails(event.detail)}
  >
    <TableBodyRow slot="row" let:row>
      <TableBodyCell>{row.id}</TableBodyCell>
      <TableBodyCell>{row.student?.name ?? "-"}</TableBodyCell>
      <TableBodyCell>{row.department?.name ?? "-"}</TableBodyCell>
      <TableBodyCell>
        <Badge color={getBadgeColor(row.status)}>{row.status}</Badge>
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
        <Select bind:value={selectedDepartmentId}>
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
        <Select bind:value={selectedStatus}>
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


