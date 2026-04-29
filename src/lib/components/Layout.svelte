<script lang="ts">
  import { Badge, Button, Dropdown, DropdownItem } from "flowbite-svelte";

  import { BarsOutline, BellSolid } from "flowbite-svelte-icons";
  import BreadCrumb from "./BreadCrumb.svelte";
  import { type BreadCrumItemType } from "./types";
  import { navigate, useLocation } from "svelte-routing";
  import { logOut, userStore } from "../../stores/user.store";
  import type { User } from "$lib/types";
  import { hasAnyPermission } from "$lib/utils/permissions";
  import { getPendingWorkHoursCount } from "$lib/services/work-hours.service";
  import { onDestroy } from "svelte";

  let currentUser: User | null = null;
  let currentPath = "/";
  const location = useLocation();
  let pendingHours = 0;
  let pendingTimer: ReturnType<typeof setInterval> | null = null;

  async function refreshPending() {
    if (!hasAnyPermission(currentUser, ["work-hours.approve"])) {
      pendingHours = 0;
      return;
    }
    pendingHours = await getPendingWorkHoursCount();
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
    refreshPending();
    if (!pendingTimer && currentUser) {
      pendingTimer = setInterval(refreshPending, 60_000);
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

    {#if canApproveHours}
      <Button
        color="light"
        class="h-10 relative mr-2"
        on:click={() => handleMenu("/horas-beca")}
        title="Horas beca pendientes de aprobar"
      >
        <BellSolid class="w-5 h-5" />
        {#if pendingHours > 0}
          <Badge
            color="yellow"
            class="absolute -top-2 -right-2 px-2 py-0.5 text-xs"
          >
            {pendingHours}
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

<style>
  :global(body) {
    background: #eaf1fb;
  }
</style>
