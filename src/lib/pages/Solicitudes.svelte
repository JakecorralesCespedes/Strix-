<script lang="ts">
  import {
    Alert,
    Badge,
    Button,
    Heading,
    Input,
    Label,
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
  import { hasAnyPermission } from "$lib/utils/permissions";
  import { userStore } from "../../stores/user.store";
  import type {
    Department,
    StudentOnDepartment,
    TableHeader,
    TablePagination,
    User,
  } from "$lib/types";

  const STATUS_LABELS: Record<string, string> = {
    PENDING: "Pendiente",
    APPROVED: "Aprobada",
    REJECTED: "Rechazada",
  };

  let requests: StudentOnDepartment[] = [];
  let error: string | null = null;
  let success: string | null = null;
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
  let createName = "";
  let createEmail = "";
  let createPhone = "";
  let createCode = "";
  let saving = false;

  let currentUser: User | null = null;

  userStore.subscribe((value) => {
    currentUser = value.dbUser ?? null;
  });

  $: canWrite = hasAnyPermission(
    currentUser,
    ["scholarship.write"],
    filterDepartmentId,
  );

  const headers: TableHeader[] = [
    { name: "Carnet", field: "code" },
    { name: "Departamento", field: "department" },
    { name: "Estado", field: "status" },
    { name: "Acciones", field: "actions" },
  ];

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

  function exportRequestsCsv() {
    if (!requests.length) {
      error = "No hay solicitudes para exportar.";
      return;
    }

    const header = [
      "Carnet",
      "Estudiante",
      "Correo",
      "Teléfono",
      "Departamento",
      "Estado",
    ];
    const rows = requests.map((request) => [
      request.student?.code ?? "-",
      request.student?.name ?? "-",
      request.student?.email ?? "-",
      request.student?.phone ?? "-",
      request.department?.name ?? "-",
      statusLabel(request.status),
    ]);

    const csv = [header, ...rows]
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

  function openCreate() {
    if (!canWrite) return;
    createDepartmentId = filterDepartmentId ?? departmentOptions[0]?.id ?? null;
    createName = "";
    createEmail = "";
    createPhone = "";
    createCode = "";
    error = null;
    success = null;
    createOpen = true;
  }

  async function handleCreate() {
    if (!createDepartmentId) {
      error = "Selecciona un departamento.";
      return;
    }
    if (!createName.trim() || !createEmail.trim() || !createCode.trim()) {
      error =
        "Completa nombre, correo y carnet del estudiante antes de guardar.";
      return;
    }

    saving = true;
    const created = await createScholarshipRequest({
      departmentId: Number(createDepartmentId),
      name: createName.trim(),
      email: createEmail.trim(),
      phone: createPhone.trim(),
      code: createCode.trim(),
    });
    saving = false;

    if (!created) {
      error =
        "No se pudo crear la solicitud. Verifica que el carnet no esté repetido en este departamento.";
      return;
    }

    createOpen = false;
    success =
      "Solicitud creada como Pendiente. El jefe de departamento debe aprobarla antes de que el estudiante pueda registrar horas.";
    await loadRequests();
  }

  function handleFilterChange() {
    pagination.page = 1;
    loadRequests();
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
    error = null;
    success = null;
    detailsOpen = true;
  }

  async function handleSave() {
    if (!selectedRequest) return;
    if (!canWrite) {
      error = "No tienes permiso para actualizar esta solicitud.";
      return;
    }

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
    success =
      editStatus === "APPROVED"
        ? "Solicitud aprobada. Se notificará por correo al estudiante si SMTP está activo."
        : editStatus === "REJECTED"
          ? "Solicitud rechazada. Se notificará por correo al estudiante si SMTP está activo."
          : "Solicitud actualizada.";
    await loadRequests();
  }

  onMount(() => {
    loadRequests();
    loadDepartments();
  });
</script>

<div class="w-full h-full px-2 sm:px-4 grid gap-3">
  <div
    class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
  >
    <Heading tag="h3" class="mb-1">Solicitudes de beca</Heading>
    <div class="flex flex-wrap items-center gap-2">
      {#if canWrite}
        <Button size="sm" color="primary" on:click={openCreate}>
          Nueva solicitud
        </Button>
      {/if}
      <Button
        size="sm"
        color="alternative"
        on:click={exportRequestsCsv}
        disabled={!requests.length}>Exportar CSV</Button
      >
    </div>
  </div>

  <p class="text-xs text-gray-500">
    Registra la solicitud con la información completa del estudiante. Si ya
    existe (mismo carnet o correo), sus datos se actualizan automáticamente. Una
    vez aprobada por el jefe de departamento, el estudiante queda disponible
    para registrar horas.
  </p>

  <div class="grid sm:grid-cols-2 gap-3">
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
        <option value="PENDING">Pendientes</option>
        <option value="APPROVED">Aprobadas</option>
        <option value="REJECTED">Rechazadas</option>
      </Select>
    </div>
  </div>

  {#if error}
    <Alert color="red" dismissable>{error}</Alert>
  {/if}
  {#if success}
    <Alert color="green" dismissable>{success}</Alert>
  {/if}

  <Table
    data={requests}
    {headers}
    {pagination}
    on:next={nextPage}
    on:previous={previousPage}
  >
    <TableBodyRow slot="row" let:row>
      <TableBodyCell>{row.student?.code ?? "-"}</TableBodyCell>
      <TableBodyCell>{row.department?.name ?? "-"}</TableBodyCell>
      <TableBodyCell>
        <Badge color={getBadgeColor(row.status)}
          >{statusLabel(row.status)}</Badge
        >
      </TableBodyCell>
      <TableBodyCell>
        <Button size="xs" color="alternative" on:click={() => openDetails(row)}>
          {canWrite ? "Ver / editar" : "Ver"}
        </Button>
      </TableBodyCell>
    </TableBodyRow>
  </Table>
</div>

<Modal title="Detalles de la solicitud" bind:open={detailsOpen} outsideclose>
  {#if selectedRequest}
    <div class="grid gap-3">
      <div class="grid sm:grid-cols-2 gap-3">
        <div>
          <p class="text-sm text-gray-500">Estudiante</p>
          <p class="font-medium">{selectedRequest.student?.name ?? "-"}</p>
        </div>
        <div>
          <p class="text-sm text-gray-500">Carnet</p>
          <p class="font-medium">{selectedRequest.student?.code ?? "-"}</p>
        </div>
        <div>
          <p class="text-sm text-gray-500">Correo</p>
          <p class="font-medium break-all">
            {selectedRequest.student?.email ?? "-"}
          </p>
        </div>
        <div>
          <p class="text-sm text-gray-500">Teléfono</p>
          <p class="font-medium">{selectedRequest.student?.phone ?? "-"}</p>
        </div>
      </div>
      <div>
        <p class="text-sm text-gray-500">Departamento</p>
        <Select bind:value={editDepartmentId} disabled={!canWrite}>
          <option value={""}>Selecciona un departamento</option>
          {#each departmentOptions as department}
            <option value={department.id}>{department.name}</option>
          {/each}
        </Select>
      </div>
      <div>
        <p class="text-sm text-gray-500">Estado</p>
        <Select bind:value={editStatus} disabled={!canWrite}>
          <option value="PENDING">Pendiente</option>
          <option value="APPROVED">Aprobada</option>
          <option value="REJECTED">Rechazada</option>
        </Select>
        <p class="text-xs text-gray-400 mt-1">
          Al aprobar o rechazar se enviará un correo al estudiante (si SMTP está
          configurado y la notificación está activa).
        </p>
      </div>
    </div>
  {/if}

  <svelte:fragment slot="footer">
    {#if canWrite}
      <Button color="primary" on:click={handleSave}>Guardar cambios</Button>
    {/if}
    <Button color="alternative" on:click={() => (detailsOpen = false)}>
      Cerrar
    </Button>
  </svelte:fragment>
</Modal>

<Modal
  title="Nueva solicitud de beca"
  bind:open={createOpen}
  outsideclose
  size="md"
>
  <div class="grid gap-3">
    <p class="text-xs text-gray-500">
      Llena los datos del estudiante. Si el carnet o el correo ya existe en el
      sistema, los datos del estudiante se actualizan y se genera la solicitud.
    </p>

    <div>
      <Label class="mb-1">Departamento</Label>
      <Select bind:value={createDepartmentId}>
        <option value={""}>Selecciona un departamento</option>
        {#each departmentOptions as department}
          <option value={department.id}>{department.name}</option>
        {/each}
      </Select>
    </div>

    <div class="grid sm:grid-cols-2 gap-3">
      <div>
        <Label class="mb-1">Nombre completo</Label>
        <Input bind:value={createName} placeholder="Ej: Carmen Pérez" />
      </div>
      <div>
        <Label class="mb-1">Carnet</Label>
        <Input bind:value={createCode} placeholder="Ej: 2026-0001" />
      </div>
      <div>
        <Label class="mb-1">Correo electrónico</Label>
        <Input
          type="email"
          bind:value={createEmail}
          placeholder="carmen@universidad.edu"
        />
      </div>
      <div>
        <Label class="mb-1">Teléfono</Label>
        <Input bind:value={createPhone} placeholder="+506 6000-0000" />
      </div>
    </div>

    <Alert color="yellow">
      La solicitud queda como <b>Pendiente</b>. Solo el jefe del departamento
      (rol con permiso <code>scholarship.write</code>) puede aprobarla o
      rechazarla.
    </Alert>
  </div>

  <svelte:fragment slot="footer">
    <Button color="primary" on:click={handleCreate} disabled={saving}>
      {saving ? "Guardando..." : "Crear solicitud"}
    </Button>
    <Button color="alternative" on:click={() => (createOpen = false)}>
      Cerrar
    </Button>
  </svelte:fragment>
</Modal>
