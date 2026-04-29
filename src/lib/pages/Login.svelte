<script lang="ts">
  import { navigate } from "svelte-routing";
  import { authenticate } from "../../stores/user.store";
  import { InfoCircleSolid } from "flowbite-svelte-icons";
  import { Card, Button, Label, Input, Alert } from "flowbite-svelte";
  import { requestPasswordReset } from "$lib/services/config.service";

  let email = "";
  let password = "";
  let error = "";
  let success = "";

  let forgotOpen = false;
  let forgotEmail = "";
  let forgotLoading = false;

  async function handleLogin() {
    error = "";
    success = "";
    if (await authenticate(email, password)) {
      navigate("/");
    } else {
      error = "Datos incorrectos";
    }
  }

  function openForgot() {
    forgotEmail = email;
    forgotOpen = true;
    error = "";
    success = "";
  }

  async function handleForgot() {
    if (!forgotEmail.trim()) {
      error = "Ingresa tu correo electrónico.";
      return;
    }
    forgotLoading = true;
    const ok = await requestPasswordReset(forgotEmail.trim());
    forgotLoading = false;
    if (ok) {
      success =
        "Si tu correo existe en el sistema, te enviamos un enlace para restablecer tu contraseña.";
      forgotOpen = false;
    } else {
      error =
        "No se pudo enviar el correo. Verifica tu conexión o intenta más tarde.";
    }
  }
</script>

<div class="w-full min-h-screen flex items-center justify-center px-4">
  <Card class="w-full max-w-md">
    {#if !forgotOpen}
      <form
        class="flex flex-col space-y-6"
        on:submit|preventDefault={handleLogin}
      >
        <h3 class="text-xl font-medium text-gray-900 dark:text-white">
          Bienvenido | Inicia sesión
        </h3>
        <Label class="space-y-2">
          <span>Correo</span>
          <Input
            type="email"
            name="email"
            placeholder="usuario@correo.com"
            bind:value={email}
            required
          />
        </Label>
        <Label class="space-y-2">
          <span>Contraseña</span>
          <Input
            type="password"
            name="password"
            placeholder="•••••"
            required
            bind:value={password}
          />
        </Label>

        <Button color="blue" type="submit" class="w-full">Iniciar sesión</Button
        >

        <button
          type="button"
          class="text-sm text-blue-600 hover:underline self-start"
          on:click={openForgot}
        >
          ¿Olvidaste tu contraseña?
        </button>

        {#if error}
          <Alert color="red">
            <InfoCircleSolid slot="icon" class="w-5 h-5" /> {error}</Alert
          >
        {/if}
        {#if success}
          <Alert color="green">{success}</Alert>
        {/if}
      </form>
    {:else}
      <form
        class="flex flex-col space-y-6"
        on:submit|preventDefault={handleForgot}
      >
        <h3 class="text-xl font-medium text-gray-900 dark:text-white">
          Recuperar contraseña
        </h3>
        <p class="text-sm text-gray-500">
          Ingresa el correo asociado a tu cuenta y te enviaremos un enlace para
          crear una nueva contraseña.
        </p>
        <Label class="space-y-2">
          <span>Correo</span>
          <Input
            type="email"
            placeholder="usuario@correo.com"
            bind:value={forgotEmail}
            required
          />
        </Label>

        <div class="flex gap-2">
          <Button
            color="blue"
            type="submit"
            class="flex-1"
            disabled={forgotLoading}
          >
            {forgotLoading ? "Enviando..." : "Enviar enlace"}
          </Button>
          <Button
            color="alternative"
            type="button"
            on:click={() => (forgotOpen = false)}
          >
            Cancelar
          </Button>
        </div>

        {#if error}
          <Alert color="red">
            <InfoCircleSolid slot="icon" class="w-5 h-5" /> {error}</Alert
          >
        {/if}
      </form>
    {/if}
  </Card>
</div>
