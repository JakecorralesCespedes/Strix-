<script lang="ts">
  import { onMount } from "svelte";
  import { navigate } from "svelte-routing";
  import { authReady, userStore } from "../../stores/user.store";
  import { getCurrentUser } from "$lib/services/user.service";
  import type { UserStoreState } from "../../stores/user.store";

  export let component: any;

  let Component: any = null;
  let userState: UserStoreState = { firebaseUser: null, dbUser: null };
  let isAuthReady = false;

  userStore.subscribe((value) => {
    userState = value;
  });

  authReady.subscribe((value) => {
    isAuthReady = value;
  });

  onMount(async () => {
    if (!isAuthReady) {
      return;
    }

    if (
      userState.firebaseUser !== null &&
      userState.firebaseUser !== undefined
    ) {
      // Load user from database
      const dbUser = await getCurrentUser();
      userStore.update((current) => ({ ...current, dbUser }));
      Component = component;
    } else {
      navigate("/login");
    }
  });

  $: if (
    isAuthReady &&
    userState.firebaseUser !== null &&
    userState.firebaseUser !== undefined
  ) {
    if (!userState.dbUser) {
      // Load user if not already loaded
      getCurrentUser().then((dbUser) => {
        userStore.update((current) => ({ ...current, dbUser }));
      });
    }
    Component = component;
  }

  $: if (
    isAuthReady &&
    (userState.firebaseUser === null || userState.firebaseUser === undefined)
  ) {
    Component = null;
    navigate("/login");
  }
</script>

{#if Component}
  <svelte:component this={Component} />
{:else}
  <p class="text-center text-gray-500 py-10">Cargando...</p>
{/if}
