<script lang="ts">
  import { Alert, Badge, Card, Heading, Spinner } from "flowbite-svelte";
  import { getCurrentUser, getUsers } from "$lib/services/user.service";
  import { getDepartment } from "$lib/services/department.service";
  import { getPeriods } from "$lib/services/period.service";
  import { getPendingWorkHoursCount } from "$lib/services/work-hours.service";
  import { getScholarshipRequests } from "$lib/services/scholarship-request.service";
  import { hasAnyPermission } from "$lib/utils/permissions";
  import type { Period, User } from "$lib/types";

  const PERIOD_STATUS_LABELS: Record<string, string> = {
    PENDING: "Pendiente",
    ACTIVE: "Activo",
    FINISHED: "Finalizado",
    CLOSED: "Cerrado",
  };

  function periodStatusLabel(value: string) {
    return PERIOD_STATUS_LABELS[value] ?? value;
  }

  let loading = true;
  let error: string | null = null;

  let currentUser: User | null = null;
  let totalUsers = 0;
  let totalDepartments = 0;
  let totalRequests = 0;
  let activePeriods = 0;
  let latestPeriod: Period | null = null;
  let pendingHoursCount = 0;
  let canApproveHours = false;
  let canViewUsers = false;
  let canViewRequests = false;

  function getStatusColor(status: string) {
    if (status === "ACTIVE") return "green";
    if (status === "PENDING") return "yellow";
    if (status === "FINISHED") return "blue";
    return "dark";
  }

  async function loadDashboard() {
    loading = true;
    error = null;

    try {
      const userRes = await getCurrentUser();
      currentUser = userRes;

      canViewUsers = hasAnyPermission(currentUser, ["users.read"]);
      canViewRequests = hasAnyPermission(currentUser, ["scholarship.read"]);
      canApproveHours = hasAnyPermission(currentUser, ["work-hours.approve"]);

      const tasks: Array<Promise<unknown>> = [
        getDepartment({ page: 1, size: 1 }),
        getPeriods({ page: 1, size: 50 }),
      ];

      if (canViewUsers) {
        tasks.push(getUsers({ page: 1, size: 1 }));
      }
      if (canViewRequests) {
        tasks.push(
          getScholarshipRequests({ page: 1, size: 1, status: "PENDING" }),
        );
      }

      const results = await Promise.all(tasks);
      const [departmentsRes, periodsRes, ...rest] = results as [
        any,
        any,
        ...unknown[],
      ];

      let extraIndex = 0;
      if (canViewUsers) {
        const usersRes = rest[extraIndex++] as any;
        totalUsers = usersRes?.total ?? 0;
      }
      if (canViewRequests) {
        const requestsRes = rest[extraIndex++] as any;
        totalRequests = requestsRes?.total ?? 0;
      }

      totalDepartments = departmentsRes?.total ?? 0;

      const periods: Period[] = periodsRes?.data ?? [];
      activePeriods = periods.filter((item) => item.status === "ACTIVE").length;
      latestPeriod = periods[0] ?? null;

      if (canApproveHours) {
        pendingHoursCount = await getPendingWorkHoursCount();
      }

      if (!userRes) {
        error = "No se pudo cargar el perfil del usuario autenticado.";
      }
    } catch (e) {
      error = "No se pudo cargar el panel inicial.";
    } finally {
      loading = false;
    }
  }

  loadDashboard();
</script>

<div class="mt-4 grid gap-4">
  {#if error}
    <Alert color="red" dismissable>{error}</Alert>
  {/if}

  {#if loading}
    <div class="h-[70vh] flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  {:else}
    <div class="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
      {#if canViewUsers}
        <Card>
          <Heading tag="h6" class="text-gray-500">Usuarios</Heading>
          <p class="text-3xl font-semibold">{totalUsers}</p>
        </Card>
      {/if}
      <Card>
        <Heading tag="h6" class="text-gray-500">Departamentos</Heading>
        <p class="text-3xl font-semibold">{totalDepartments}</p>
      </Card>
      {#if canViewRequests}
        <Card>
          <Heading tag="h6" class="text-gray-500"
            >Solicitudes pendientes</Heading
          >
          <p
            class="text-3xl font-semibold {totalRequests > 0
              ? 'text-yellow-500'
              : ''}"
          >
            {totalRequests}
          </p>
        </Card>
      {/if}
      <Card>
        <Heading tag="h6" class="text-gray-500">Periodos activos</Heading>
        <p class="text-3xl font-semibold">{activePeriods}</p>
      </Card>
      {#if canApproveHours}
        <Card>
          <Heading tag="h6" class="text-gray-500">Horas beca pendientes</Heading
          >
          <p
            class="text-3xl font-semibold {pendingHoursCount > 0
              ? 'text-yellow-500'
              : ''}"
          >
            {pendingHoursCount}
          </p>
          {#if pendingHoursCount > 0}
            <Badge color="yellow" class="mt-2">Requieren verificación</Badge>
          {:else}
            <Badge color="green" class="mt-2">Al día</Badge>
          {/if}
        </Card>
      {/if}
    </div>

    <div class="grid md:grid-cols-2 gap-4">
      <Card>
        <Heading tag="h5" class="mb-2">Usuario actual</Heading>
        <p>
          <span class="font-semibold">Nombre:</span>
          {currentUser?.name ?? "-"}
        </p>
        <p>
          <span class="font-semibold">Correo:</span>
          {currentUser?.email ?? "-"}
        </p>
        <p>
          <span class="font-semibold">Rol:</span>
          {currentUser?.role?.name ?? "-"}
        </p>
        <p>
          <span class="font-semibold">Departamento:</span>
          {currentUser?.department?.name ?? "Sin asignar"}
        </p>
      </Card>

      <Card>
        <Heading tag="h5" class="mb-2">Último periodo</Heading>
        {#if latestPeriod}
          <p>
            <span class="font-semibold">Nombre:</span>
            {latestPeriod.name}
          </p>
          <p>
            <span class="font-semibold">Rango:</span>
            {new Date(latestPeriod.start).toLocaleDateString()} -
            {new Date(latestPeriod.end).toLocaleDateString()}
          </p>
          <div class="mt-2">
            <Badge color={getStatusColor(latestPeriod.status)}
              >{periodStatusLabel(latestPeriod.status)}</Badge
            >
          </div>
        {:else}
          <p class="text-gray-500">No hay periodos disponibles.</p>
        {/if}
      </Card>
    </div>
  {/if}
</div>
