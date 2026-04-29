<script lang="ts">
  import {
    Alert,
    Button,
    Heading,
    Input,
    Label,
    Spinner,
    Textarea,
  } from "flowbite-svelte";
  import { onMount } from "svelte";
  import {
    getPdfTemplate,
    updatePdfTemplate,
    type PdfTemplate,
  } from "$lib/services/config.service";
  import { hasAnyPermission } from "$lib/utils/permissions";
  import { userStore } from "$stores/user.store";
  import type { User } from "$lib/types";

  const MAX_LOGO_BYTES = 300_000;

  let template: PdfTemplate = {
    pdfInstitutionName: "",
    pdfHeaderTitle: "",
    pdfHeaderSubtitle: "",
    pdfFooterText: "",
    pdfPrimaryColor: "#1d4ed8",
    pdfSignatureLabel: "",
    pdfLogoDataUrl: "",
  };
  let loading = true;
  let saving = false;
  let error: string | null = null;
  let success: string | null = null;
  let currentUser: User | null = null;
  let canWrite = false;
  let logoInput: HTMLInputElement | null = null;

  userStore.subscribe((value) => {
    currentUser = value.dbUser ?? null;
  });

  $: canWrite = hasAnyPermission(currentUser, ["configs.write"]);

  async function load() {
    loading = true;
    const res = await getPdfTemplate();
    if (res) {
      template = res;
      error = null;
    } else {
      error = "No se pudo cargar la plantilla del PDF.";
    }
    loading = false;
  }

  async function save() {
    if (!canWrite) {
      error = "No tienes permisos para editar la plantilla del PDF.";
      return;
    }

    if (!/^#[0-9a-fA-F]{6}$/.test(template.pdfPrimaryColor)) {
      error =
        "El color primario debe ser un hex de 6 caracteres (ej. #1d4ed8).";
      return;
    }

    saving = true;
    const updated = await updatePdfTemplate(template);
    saving = false;

    if (!updated) {
      error = "No se pudo guardar la plantilla.";
      return;
    }

    template = updated;
    error = null;
    success = "Plantilla actualizada. Se aplicará al próximo PDF generado.";
  }

  function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  async function handleLogoChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!/^image\/(png|jpe?g)$/.test(file.type)) {
      error = "El logo debe ser PNG o JPEG.";
      input.value = "";
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      error = `El logo no puede pesar más de ${Math.round(MAX_LOGO_BYTES / 1024)} KB. Redúcelo antes de subirlo.`;
      input.value = "";
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      template.pdfLogoDataUrl = dataUrl;
      error = null;
    } catch {
      error = "No se pudo leer el archivo seleccionado.";
    } finally {
      input.value = "";
    }
  }

  function clearLogo() {
    template.pdfLogoDataUrl = "";
  }

  onMount(load);
</script>

<div class="w-full h-full px-4 grid gap-3">
  <div>
    <Heading tag="h3" class="mb-1">Plantilla del PDF</Heading>
    <p class="text-sm text-gray-500">
      Define los textos y colores que se usarán en los reportes PDF generados al
      cerrar un periodo. Los cambios aplican a todos los PDF siguientes.
    </p>
  </div>

  {#if error}
    <Alert color="red" dismissable>{error}</Alert>
  {/if}
  {#if success}
    <Alert color="green" dismissable>{success}</Alert>
  {/if}

  {#if loading}
    <div class="flex justify-center py-10">
      <Spinner size="lg" />
    </div>
  {:else}
    <div class="grid gap-4 max-w-3xl">
      <div class="grid sm:grid-cols-2 gap-3">
        <div>
          <Label class="mb-1">Nombre de la institución</Label>
          <Input
            bind:value={template.pdfInstitutionName}
            placeholder="Universidad Adventista Dominicana"
            disabled={!canWrite}
          />
        </div>
        <div>
          <Label class="mb-1">Color primario</Label>
          <div class="flex items-center gap-2">
            <input
              type="color"
              bind:value={template.pdfPrimaryColor}
              class="h-10 w-14 rounded border"
              disabled={!canWrite}
            />
            <Input
              bind:value={template.pdfPrimaryColor}
              placeholder="#1d4ed8"
              disabled={!canWrite}
            />
          </div>
        </div>
      </div>

      <div>
        <Label class="mb-1">Logo de la institución</Label>
        <div
          class="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 border rounded-lg bg-gray-50"
        >
          <div
            class="w-24 h-24 bg-white border rounded flex items-center justify-center overflow-hidden shrink-0"
          >
            {#if template.pdfLogoDataUrl}
              <img
                src={template.pdfLogoDataUrl}
                alt="Logo"
                class="max-w-full max-h-full object-contain"
              />
            {:else}
              <span class="text-xs text-gray-400 text-center px-2">
                Sin logo
              </span>
            {/if}
          </div>
          <div class="grid gap-1 grow">
            <input
              type="file"
              accept="image/png,image/jpeg"
              bind:this={logoInput}
              on:change={handleLogoChange}
              disabled={!canWrite}
              class="text-sm"
            />
            <p class="text-xs text-gray-500">
              PNG o JPEG, máximo {Math.round(MAX_LOGO_BYTES / 1024)} KB. Aparece
              en la esquina superior derecha del PDF.
            </p>
            {#if template.pdfLogoDataUrl && canWrite}
              <div>
                <Button size="xs" color="alternative" on:click={clearLogo}>
                  Quitar logo
                </Button>
              </div>
            {/if}
          </div>
        </div>
      </div>

      <div>
        <Label class="mb-1">Título del encabezado</Label>
        <Input
          bind:value={template.pdfHeaderTitle}
          placeholder="Reporte de horas beca"
          disabled={!canWrite}
        />
      </div>

      <div>
        <Label class="mb-1">Subtítulo del encabezado</Label>
        <Input
          bind:value={template.pdfHeaderSubtitle}
          placeholder="Departamento de Bienestar Estudiantil"
          disabled={!canWrite}
        />
      </div>

      <div>
        <Label class="mb-1">Etiqueta de firma</Label>
        <Input
          bind:value={template.pdfSignatureLabel}
          placeholder="Jefe de Departamento"
          disabled={!canWrite}
        />
        <p class="text-xs text-gray-400 mt-1">
          Aparece debajo de la línea de firma al final del PDF. Déjalo vacío
          para ocultar la firma.
        </p>
      </div>

      <div>
        <Label class="mb-1">Texto del pie de página</Label>
        <Textarea
          rows={4}
          bind:value={template.pdfFooterText}
          placeholder="Documento generado automáticamente por Strix..."
          disabled={!canWrite}
        />
      </div>

      {#if canWrite}
        <div>
          <Button color="primary" on:click={save} disabled={saving}>
            Guardar plantilla
            {#if saving}<Spinner size="sm" class="ml-2" />{/if}
          </Button>
        </div>
      {:else}
        <p class="text-xs text-gray-500">
          Solo usuarios con el permiso <code>configs.write</code> pueden editar esta
          plantilla.
        </p>
      {/if}
    </div>
  {/if}
</div>
