<script lang="ts">
  import {
    Pagination,
    PaginationItem,
    Table,
    TableBody,
    TableBodyCell,
    TableBodyRow,
    TableHead,
    TableHeadCell,
  } from "flowbite-svelte";
  import SkeletonTable from "./SkeletonTable.svelte";
  import { createEventDispatcher } from "svelte";
  import {
    type TableData,
    type TableHeader,
    type TablePagination,
  } from "../types";

  const dispatch = createEventDispatcher();
  export let headers: TableHeader[] = [];
  export let pagination: TablePagination | null = null;
  export let data: TableData<any> = [];
  export let loading = false;

  function previous() {
    dispatch("previous");
  }
  function next() {
    dispatch("next");
  }
</script>

<Table
  hoverable={true}
  striped
  divClass="relative overflow-x-auto w-full max-w-full rounded-lg border border-gray-100 bg-white"
>
  <TableHead>
    {#each headers as header}
      <slot name="header" {header}>
        <TableHeadCell padding="px-2 py-2" class="text-xs">
          {header.name}
        </TableHeadCell>
      </slot>
    {/each}
  </TableHead>
  <TableBody>
    {#if loading}
      <SkeletonTable rows={5} columns={headers.length} />
    {:else if data.length === 0}
      <TableBodyRow>
        <TableBodyCell
          colspan={headers.length}
          class="text-center text-gray-500"
        >
          Sin datos disponibles
        </TableBodyCell>
      </TableBodyRow>
    {:else}
      {#each data as row}
        <slot name="row" {row}>
          <TableBodyRow>
            {#each headers as { field, formatter }}
              <TableBodyCell>
                {#if formatter}
                  {formatter(row[field])}
                {:else}
                  {row[field]}
                {/if}
              </TableBodyCell>
            {/each}
          </TableBodyRow>
        </slot>
      {/each}
    {/if}
  </TableBody>
</Table>
<div class="flex flex-row-reverse mt-4 gap-2">
  {#if pagination}
    {#if pagination.next_page}
      <PaginationItem on:click={next}>Siguiente</PaginationItem>
    {/if}
    {#if pagination.prev_page}
      <PaginationItem on:click={previous}>Anterior</PaginationItem>
    {/if}
  {/if}
</div>
