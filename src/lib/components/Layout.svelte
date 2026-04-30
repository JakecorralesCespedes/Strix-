<script lang="ts">
  import {
    Badge,
    Button,
    Dropdown,
    DropdownItem,
    Modal,
    Spinner,
  } from "flowbite-svelte";

  import { BarsOutline, BellSolid } from "flowbite-svelte-icons";
  import BreadCrumb from "./BreadCrumb.svelte";
  import { type BreadCrumItemType } from "./types";
  import { navigate, useLocation } from "svelte-routing";
  import { logOut, userStore } from "../../stores/user.store";
  import type { User } from "$lib/types";
  import { hasAnyPermission } from "$lib/utils/permissions";
  import { getPendingWorkHoursCount } from "$lib/services/work-hours.service";
  import { getScholarshipRequests } from "$lib/services/scholarship-request.service";
  import { onDestroy } from "svelte";

  let currentUser: User | null = null;
  let currentPath = "/";
  const location = useLocation();
  let pendingHours = 0;
  let pendingRequests = 0;
  let notificationCount = 0;
  let notificationsOpen = false;
  let notificationsLoading = false;
  let pendingTimer: ReturnType<typeof setInterval> | null = null;
  let canViewRequests = false;

  async function refreshNotifications() {
    const canApprove = hasAnyPermission(currentUser, ["work-hours.approve"]);
    const canViewRequests = hasAnyPermission(currentUser, ["scholarship.read"]);

    const tasks: Array<Promise<unknown>> = [];
    if (canApprove) {
      tasks.push(getPendingWorkHoursCount());
    }
    if (canViewRequests) {
      tasks.push(
        getScholarshipRequests({ page: 1, size: 1, status: "PENDING" }),
      );
    }

    if (!tasks.length) {
      pendingHours = 0;
      pendingRequests = 0;
      return;
    }

    const results = await Promise.all(tasks);
    let index = 0;
    if (canApprove) {
      pendingHours = results[index++] as number;
    }
    if (canViewRequests) {
      const res = results[index++] as { total?: number } | null | undefined;
      pendingRequests = res?.total ?? 0;
    }
  }

  async function openNotifications() {
    notificationsOpen = true;
    notificationsLoading = true;
    await refreshNotifications();
    notificationsLoading = false;
  }

  onDestroy(() => {
    if (pendingTimer) clearInterval(pendingTimer);
  });

  const routeTitles: Record<string, string> = {
    "/": "Inicio",
    "/configuraciones": "Configuraciones",
    "/solicitudes": "Solicitudes",
    "/horas-beca": "Horas beca",
    "/reportes": "Reportes",
  };

  userStore.subscribe((value) => {
    currentUser = value.dbUser ?? null;
    refreshNotifications();
    if (!pendingTimer && currentUser) {
      pendingTimer = setInterval(refreshNotifications, 60_000);
    }
  });

  $: breadCrumbItems = [
    { title: "Inicio", path: "/", isHome: true },
    {
      title: routeTitles[currentPath] ?? "Sección",
      path: currentPath,
    },
  ] as BreadCrumItemType[];

  function handleMenu(path: string) {
    navigate(path);
  }

  async function handleLogout() {
    await logOut();
    navigate("/login");
  }

  $: currentPath = $location.pathname || "/";

  // Visibilidad de menú según permisos guardados en BD
  $: canViewConfig = hasAnyPermission(currentUser, [
    "configs.read",
    "users.read",
    "departments.read",
    "periods.read",
    "roles.read",
    "permissions.read",
    "pricing.read",
  ]);
  $: canViewScholarships = hasAnyPermission(currentUser, ["scholarship.read"]);
  $: canViewWorkHours = hasAnyPermission(currentUser, ["work-hours.read"]);
  $: canViewReports = hasAnyPermission(currentUser, ["reports.read"]);
  $: canApproveHours = hasAnyPermission(currentUser, ["work-hours.approve"]);
  $: canViewRequests = hasAnyPermission(currentUser, ["scholarship.read"]);
  $: notificationCount = pendingHours + pendingRequests;
</script>

<div class="min-h-screen px-4 sm:px-8 pt-4 overflow-x-hidden">
  <div class="flex justify-between items-center">
    <div>
      <Button color="light" class="h-10">
        <BarsOutline class="w-5 h-5 pt-1" /> Menú
      </Button>

      <Dropdown>
        <DropdownItem on:click={() => handleMenu("/")}>Inicio</DropdownItem>
        {#if canViewConfig}
          <DropdownItem on:click={() => handleMenu("/configuraciones")}>
            Configuraciones
          </DropdownItem>
        {/if}
        {#if canViewScholarships}
          <DropdownItem on:click={() => handleMenu("/solicitudes")}>
            Solicitudes
          </DropdownItem>
        {/if}
        {#if canViewWorkHours}
          <DropdownItem on:click={() => handleMenu("/horas-beca")}>
            Horas beca
          </DropdownItem>
        {/if}
        {#if canViewReports}
          <DropdownItem on:click={() => handleMenu("/reportes")}>
            Reportes
          </DropdownItem>
        {/if}
      </Dropdown>
    </div>
    <div class="grow mx-2">
      <BreadCrumb items={breadCrumbItems}></BreadCrumb>
    </div>

    {#if canApproveHours || canViewRequests}
      <Button
        color="light"
        class="h-10 relative mr-2"
        on:click={openNotifications}
        title="Notificaciones pendientes"
      >
        <BellSolid class="w-5 h-5" />
        {#if notificationCount > 0}
          <Badge
            color="yellow"
            class="absolute -top-2 -right-2 px-2 py-0.5 text-xs"
          >
            {notificationCount}
          </Badge>
        {/if}
      </Button>
    {/if}

    <Button color="light" class="h-10">
      <BarsOutline class="w-5 h-5 pt-1" />
      {currentUser?.name ?? "Usuario"}
    </Button>

    <Dropdown>
      <DropdownItem class="text-red-500" on:click={handleLogout}>
        Cerrar sesión
      </DropdownItem>
    </Dropdown>
  </div>
  <slot />
</div>

<Modal title="Notificaciones" bind:open={notificationsOpen} outsideclose>
  {#if notificationsLoading}
    <div class="flex justify-center py-6">
      <Spinner size="lg" />
    </div>
  {:else}
    <div class="grid gap-3">
      {#if canApproveHours}
        <div
          class="p-3 border rounded-lg bg-white flex items-center justify-between"
        >
          <div>
            <p class="font-medium text-sm">Horas beca pendientes</p>
            <p class="text-xs text-gray-500">Por revisar y aprobar</p>
          </div>
          <div class="flex items-center gap-2">
            <Badge color={pendingHours > 0 ? "yellow" : "green"}>
              {pendingHours}
            </Badge>
            <Button
              size="xs"
              color="alternative"
              on:click={() => {
                notificationsOpen = false;
                handleMenu("/horas-beca");
              }}
            >
              Ver
            </Button>
          </div>
        </div>
      {/if}

      {#if canViewRequests}
        <div
          class="p-3 border rounded-lg bg-white flex items-center justify-between"
        >
          <div>
            <p class="font-medium text-sm">Solicitudes pendientes</p>
            <p class="text-xs text-gray-500">Estudiantes por aprobar</p>
          </div>
          <div class="flex items-center gap-2">
            <Badge color={pendingRequests > 0 ? "yellow" : "green"}>
              {pendingRequests}
            </Badge>
            <Button
              size="xs"
              color="alternative"
              on:click={() => {
                notificationsOpen = false;
                handleMenu("/solicitudes");
              }}
            >
              Ver
            </Button>
          </div>
        </div>
      {/if}

      {#if notificationCount === 0}
        <p class="text-sm text-gray-500 text-center py-4">
          No hay notificaciones pendientes.
        </p>
      {/if}
    </div>
  {/if}

  <svelte:fragment slot="footer">
    <Button color="alternative" on:click={() => (notificationsOpen = false)}>
      Cerrar
    </Button>
  </svelte:fragment>
</Modal>

<style>
  :global(body) {
    background: #eaf1fb;
  }
</style>
