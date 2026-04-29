<script lang="ts">
  import { Route, Router } from "svelte-routing";
  import Layout from "./lib/components/Layout.svelte";
  import routes from "./routes";
  import ProtectedRoute from "$lib/components/ProtectedRoute.svelte";
  import Login from "$lib/pages/Login.svelte";

  let url = "";

  const appRoutes = routes.filter((route) => route.path !== "/login");
</script>

<Router {url}>
  <Route path="/login" component={Login} />

  <Layout>
    {#each appRoutes as { component, path, authRequired }}
      {#if authRequired}
        <Route {path} let:params>
          <ProtectedRoute {component} />
        </Route>
      {:else}
        <Route {path} {component} />
      {/if}
    {/each}
    <!-- Ruta para manejar 404 -->
    <Route path="*">
      <h1 class="text-center text-2xl font-semibold">
        404 - Página no encontrada
      </h1>
    </Route>
  </Layout>
</Router>
