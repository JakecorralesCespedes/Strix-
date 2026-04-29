<script lang="ts">
  import { Alert, Heading, Listgroup, ListgroupItem } from "flowbite-svelte";
  import { onMount } from "svelte";
  import { getPermissions } from "$lib/services/permission.service";

  let permissions: string[] = [];
  let error: string | null = null;

  async function loadPermissions() {
    const res = await getPermissions();
    permissions = res;

    if (permissions.length === 0) {
      error = "No se pudieron cargar permisos o la lista está vacía.";
      return;
    }

    error = null;
  }

  onMount(() => {
    loadPermissions();
  });
</script>

<div class="w-full h-full px-4 grid gap-3">
  <Heading tag="h3" class="mb-2">Configuración de permisos</Heading>

  <p class="text-xs text-gray-500">
    Lista de todos los permisos disponibles en el sistema. Asígnalos a roles
    desde la pestaña "Roles".
  </p>

  {#if error}
    <Alert color="yellow" dismissable>{error}</Alert>
  {/if}

  <Listgroup>
    {#each permissions as permission}
      <ListgroupItem>{permission}</ListgroupItem>
    {/each}
  </Listgroup>
</div>
