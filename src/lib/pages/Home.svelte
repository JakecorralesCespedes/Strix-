<script lang="ts">
  import { Alert, Badge, Button, Card, Heading, Spinner } from "flowbite-svelte";
  import { getCurrentUser, getUsers } from "$lib/services/user.service";
  import { getDepartment } from "$lib/services/department.service";
  import { getPeriods } from "$lib/services/period.service";
  import { getMailingList } from "$lib/services/mailing-list.service";
  import { getPendingWorkHoursCount } from "$lib/services/work-hours.service";
  import { hasAnyPermission } from "$lib/utils/permissions";
  import type { Period, User } from "$lib/types";

  let loading = true;
  let error: string | null = null;

  let currentUser: User | null = null;
  let totalUsers = 0;
  let totalDepartments = 0;
  let totalMailing = 0;
  let activePeriods = 0;
  let latestPeriod: Period | null = null;
  let pendingHoursCount = 0;
  let canApprovHours = false;

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
      const [userRes, usersRes, departmentsRes, periodsRes, mailingRes] =
        await Promise.all([
          getCurrentUser(),
          getUsers({ page: 1, size: 1 }),
          getDepartment({ page: 1, size: 1 }),
          getPeriods({ page: 1, size: 50 }),
          getMailingList({ page: 1, size: 1 }),
        ]);

      currentUser = userRes;
      totalUsers = usersRes?.total ?? 0;
      totalDepartments = departmentsRes?.total ?? 0;
      totalMailing = mailingRes?.total ?? 0;

      const periods = periodsRes?.data ?? [];
      activePeriods = periods.filter((item) => item.status === "ACTIVE").length;
      latestPeriod = periods[0] ?? null;

      canApprovHours = hasAnyPermission(currentUser, ["work-hours.approve"]);

      if (canApprovHours) {
        pendingHoursCount = await getPendingWorkHoursCount();
      }

      if (!userRes) {
        error = "No se pudo cargar el perfil del usuario autenticado.";
      }
    } catch (e) {
      error = "No se pudo cargar el dashboard inicial.";
    } finally {
      loading = false;
    }
  }

  loadDashboard();
</script>

<div class="mt-4 grid gap-4">
  {#if error}
    <Alert type="error" dismissable>{error}</Alert>
  {/if}

  {#if loading}
    <div class="h-[70vh] flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  {:else}
    <div class="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
      <Card>
        <Heading tag="h6" class="text-gray-500">Usuarios</Heading>
        <p class="text-3xl font-semibold">{totalUsers}</p>
      </Card>
      <Card>
        <Heading tag="h6" class="text-gray-500">Departamentos</Heading>
        <p class="text-3xl font-semibold">{totalDepartments}</p>
      </Card>
      <Card>
        <Heading tag="h6" class="text-gray-500">Correos de aviso</Heading>
        <p class="text-3xl font-semibold">{totalMailing}</p>
      </Card>
      <Card>
        <Heading tag="h6" class="text-gray-500">Periodos activos</Heading>
        <p class="text-3xl font-semibold">{activePeriods}</p>
      </Card>
      {#if canApprovHours}
        <Card>
          <Heading tag="h6" class="text-gray-500">Horas beca pendientes</Heading>
          <p class="text-3xl font-semibold {pendingHoursCount > 0 ? 'text-yellow-500' : ''}">
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
        <p><span class="font-semibold">Nombre:</span> {currentUser?.name ?? "-"}</p>
        <p><span class="font-semibold">Correo:</span> {currentUser?.email ?? "-"}</p>
        <p><span class="font-semibold">Rol:</span> {currentUser?.role?.name ?? "-"}</p>
        <p>
          <span class="font-semibold">Departamento:</span>
          {currentUser?.department?.name ?? "Sin asignar"}
        </p>
      </Card>

      <Card>
        <Heading tag="h5" class="mb-2">Ultimo periodo</Heading>
        {#if latestPeriod}
          <p><span class="font-semibold">Nombre:</span> {latestPeriod.name}</p>
          <p>
            <span class="font-semibold">Rango:</span>
            {new Date(latestPeriod.start).toLocaleDateString()} -
            {new Date(latestPeriod.end).toLocaleDateString()}
          </p>
          <div class="mt-2">
            <Badge color={getStatusColor(latestPeriod.status)}>{latestPeriod.status}</Badge>
          </div>
        {:else}
          <p class="text-gray-500">No hay periodos disponibles.</p>
        {/if}
      </Card>
    </div>
  {/if}
</div>
