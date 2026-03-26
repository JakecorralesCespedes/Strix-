<script lang="ts">
  import PageContainer from "$lib/components/PageContainer.svelte";
  import General from "./configurations/General.svelte";
  import type { PageConfigType } from "$lib/components/types";
  import Periods from "./configurations/Periods.svelte";
  import Departments from "./configurations/Departments.svelte";
  import Users from "./configurations/Users.svelte";
  import Roles from "./configurations/Roles.svelte";
  import Permissions from "./configurations/Permissions.svelte";
  import Pricing from "./configurations/Pricing.svelte";
  import { userStore } from "../../stores/user.store";
  import type { User } from "$lib/types";
  import { hasAnyPermission } from "$lib/utils/permissions";

  let currentUser: User | null = null;

  userStore.subscribe((value) => {
    currentUser = value.dbUser ?? null;
  });

  const config: PageConfigType[] = [
    {
      title: "General",
      component: General,
      open: false,
      permissions: ["configs.read"],
    },
    {
      title: "Departamentos",
      component: Departments,
      open: false,
      permissions: ["departments.read"],
    },
    {
      title: "Usuarios",
      component: Users,
      open: false,
      permissions: ["users.read"],
    },
    {
      title: "Roles",
      component: Roles,
      open: false,
      permissions: ["roles.read"],
    },
    {
      title: "Permisos",
      component: Permissions,
      open: false,
      permissions: ["permissions.read"],
    },
    {
      title: "Periodos",
      component: Periods,
      open: false,
      permissions: ["periods.read"],
    },
    {
      title: "Precios",
      component: Pricing,
      open: false,
      permissions: ["pricing.read"],
    },
  ];

  $: visibleTabs = config
    .filter((tab) => hasAnyPermission(currentUser, tab.permissions ?? []))
    .map((tab, index) => ({
      ...tab,
      open: index === 0,
    }));
</script>

<PageContainer tabs={visibleTabs}></PageContainer>
