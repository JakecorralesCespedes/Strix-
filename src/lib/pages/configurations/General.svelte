<script lang="ts">
  import { Alert, Badge, Heading, Toggle } from "flowbite-svelte";
  import { onMount } from "svelte";
  import {
    getConfig,
    updateConfig,
    getSmtpStatus,
    getNotificationToggles,
    updateNotificationToggles,
  } from "../../services/config.service";
  import type {
    SmtpStatus,
    NotificationToggles,
  } from "../../services/config.service";
  import GeneralConfigForm from "../../components/GeneralConfigForm.svelte";
  import type { GlobalSetting, User } from "../../types";
  import { hasAnyPermission } from "$lib/utils/permissions";
  import { userStore } from "../../../stores/user.store";

  let globalSetting: GlobalSetting | null = null;
  let smtpStatus: SmtpStatus | null = null;
  let toggles: NotificationToggles | null = null;

  let error: string | null = null;
  let success: string | null = null;
  let isLoading = false;
  let savingToggles = false;

  let currentUser: User | null = null;
  $: canWrite = hasAnyPermission(currentUser, ["configs.write"]);

  userStore.subscribe((value) => {
    currentUser = value.dbUser ?? null;
  });

  const NOTIFICATION_DESCRIPTIONS: Array<{
    key: keyof NotificationToggles;
    title: string;
    description: string;
  }> = [
    {
      key: "notify.user.welcome",
      title: "Bienvenida a usuarios nuevos",
      description:
        "Enviar correo con el correo, contraseña, rol y departamento cuando se cree una cuenta.",
    },
    {
      key: "notify.user.passwordReset",
      title: "Recuperación de contraseña",
      description:
        "Enviar enlace de restablecimiento cuando un usuario olvida su contraseña.",
    },
    {
      key: "notify.scholarship.approved",
      title: "Solicitud de beca aprobada",
      description:
        "Avisar al estudiante cuando su solicitud de horas beca sea aprobada.",
    },
    {
      key: "notify.scholarship.rejected",
      title: "Solicitud de beca rechazada",
      description:
        "Avisar al estudiante cuando su solicitud de horas beca sea rechazada.",
    },
    {
      key: "notify.workHours.approved",
      title: "Horas beca aprobadas",
      description:
        "Avisar al estudiante cuando se aprueben sus horas trabajadas.",
    },
  ];

  async function reloadConfig() {
    isLoading = true;
    try {
      const res = await getConfig();
      globalSetting = res ?? null;

      if (!res) {
        error =
          "No se pudo cargar la configuración. Revisa tu sesión o el backend.";
      }
    } catch {
      error = "Error cargando configuración";
      globalSetting = null;
    } finally {
      isLoading = false;
    }
  }

  async function reloadSmtpStatus() {
    smtpStatus = await getSmtpStatus();
  }

  async function reloadToggles() {
    toggles = await getNotificationToggles();
  }

  onMount(async () => {
    reloadConfig();
    reloadSmtpStatus();
    reloadToggles();
  });

  function handleUpdate(e: CustomEvent<GlobalSetting>) {
    isLoading = true;
    updateConfig(e.detail)
      .then(() => reloadConfig())
      .then(() => {
        error = null;
        success = "Configuración actualizada";
      })
      .catch((err) => {
        error = err.message;
      });
    isLoading = false;
  }

  async function handleToggleChange(
    key: keyof NotificationToggles,
    value: boolean,
  ) {
    if (!toggles || !canWrite) return;
    savingToggles = true;
    const updated = await updateNotificationToggles({ [key]: value });
    savingToggles = false;
    if (updated) {
      toggles = updated;
      success = "Preferencias de notificaciones actualizadas";
    } else {
      error = "No se pudo actualizar la preferencia.";
      reloadToggles();
    }
  }

  function onToggleChange(key: keyof NotificationToggles, event: Event) {
    const target = event.currentTarget as HTMLInputElement | null;
    if (!target) return;
    handleToggleChange(key, target.checked);
  }
</script>

<div class="w-full h-full px-4 grid gap-3">
  <div class="grid-flow-row">
    <Heading tag="h3" class="mb-4">Configuración general</Heading>
  </div>
  <div class="grid-flow-row">
    <Heading tag="h5" class="mb-4">Configuración predeterminada</Heading>
    {#if error}
      <Alert color="red" dismissable>{error}</Alert>
    {/if}
    {#if success}
      <Alert color="green" dismissable>{success}</Alert>
    {/if}
    <GeneralConfigForm
      currentState={globalSetting}
      on:update={handleUpdate}
      {isLoading}
    ></GeneralConfigForm>
  </div>

  <div class="grid-flow-row">
    <Heading tag="h5" class="mb-2">Servicio de correos</Heading>
    {#if smtpStatus}
      <div class="p-4 border rounded-lg bg-gray-50 grid gap-2">
        <div class="flex items-center gap-2">
          <span class="font-semibold text-sm">Estado:</span>
          <Badge color={smtpStatus.configured ? "green" : "red"}>
            {smtpStatus.configured ? "Activo" : "No configurado"}
          </Badge>
        </div>
        <p class="text-sm text-gray-600">{smtpStatus.note}</p>
        {#if !smtpStatus.configured}
          <div class="mt-2">
            <p class="text-xs font-semibold text-gray-500 mb-1">
              Variables de entorno requeridas en el servidor:
            </p>
            <div class="flex flex-wrap gap-1">
              {#each smtpStatus.requiredEnvVars as v}
                <code class="text-xs bg-gray-200 px-2 py-0.5 rounded">{v}</code>
              {/each}
            </div>
            <p class="text-xs font-semibold text-gray-500 mt-2 mb-1">
              Opcionales:
            </p>
            <div class="flex flex-wrap gap-1">
              {#each smtpStatus.optionalEnvVars as v}
                <code class="text-xs bg-gray-200 px-2 py-0.5 rounded">{v}</code>
              {/each}
            </div>
            <p class="text-xs text-gray-400 mt-2">
              Estas variables deben configurarse manualmente en el servidor
              donde corre el backend. Una vez configuradas, el servicio se
              activará automáticamente.
            </p>
          </div>
        {/if}
      </div>
    {:else}
      <p class="text-sm text-gray-400">
        Cargando estado del servicio de correos...
      </p>
    {/if}
  </div>

  <div class="grid-flow-row">
    <Heading tag="h5" class="mb-2">Notificaciones por correo</Heading>
    <p class="text-xs text-gray-500 mb-3">
      Activa o desactiva los correos automáticos que envía el sistema. Si el
      servicio SMTP está deshabilitado, ningún correo se enviará aunque el
      interruptor esté activo.
    </p>
    {#if toggles}
      <div class="grid gap-2">
        {#each NOTIFICATION_DESCRIPTIONS as item}
          <div
            class="p-3 border rounded-lg bg-white flex items-center justify-between gap-3"
          >
            <div>
              <p class="font-medium text-sm text-gray-900">{item.title}</p>
              <p class="text-xs text-gray-500">{item.description}</p>
            </div>
            <Toggle
              checked={toggles[item.key]}
              disabled={!canWrite || savingToggles}
              on:change={(event) => onToggleChange(item.key, event)}
            />
          </div>
        {/each}
      </div>
    {:else}
      <p class="text-sm text-gray-400">Cargando preferencias...</p>
    {/if}
  </div>
</div>
