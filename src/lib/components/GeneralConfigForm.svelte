<script lang="ts">
  import { Input, Button, Label, Spinner } from "flowbite-svelte";
  import { createEventDispatcher } from "svelte";
  import type { GlobalSetting } from "../types";
  import { PenOutline } from "flowbite-svelte-icons";

  const dispatch = createEventDispatcher();

  export let disabled = true;
  export let isLoading = false;
  export let currentState: GlobalSetting | null = null;

  $: buttonText = disabled ? "Editar" : "Guardar";

  function handleSubmit() {
    if (disabled) {
      disabled = false;
    } else {
      disabled = true;
      dispatch("update", currentState);
    }
  }
</script>

<form
  on:submit|preventDefault={handleSubmit}
  class="flex g-3 space-x-4 items-end flex-wrap gap-y-3"
>
  {#if !currentState || isLoading}
    <div class="text-center">
      <Spinner />
    </div>
  {:else}
    <Label>
      <span>Precio</span>
      <Input
        type="text"
        bind:value={currentState.defaultPrice}
        placeholder="Precio"
        {disabled}
      ></Input>
    </Label>
    <Label>
      <span>Código de estudiante</span>
      <Input
        type="text"
        bind:value={currentState.studentsCode}
        placeholder="Código de estudiante"
        {disabled}
      ></Input>
    </Label>
    <Label>
      <span>Código de beca</span>
      <Input
        type="text"
        bind:value={currentState.scolarshipCode}
        placeholder="Código de beca"
        {disabled}
      ></Input>
    </Label>
    <Label>
      <span>Código de diezmo</span>
      <Input
        type="text"
        bind:value={currentState.tithCode}
        placeholder="Código de diezmo"
        {disabled}
      ></Input>
    </Label>
    <div class="flex align-bottom">
      <Button type="submit" size="sm" color="blue">
        <PenOutline />
        {buttonText}
      </Button>
    </div>
  {/if}
</form>
