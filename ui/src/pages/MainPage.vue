<script setup lang="ts">
import '@milaboratories/graph-maker/styles';
import type { PColumnIdAndSpec, PlRef } from '@platforma-sdk/model';
import { plRefsEqual } from '@platforma-sdk/model';
import { PlBlockPage, PlDropdownRef } from '@platforma-sdk/ui-vue';
import { ref } from 'vue';
import { useApp } from '../app';

import type { PredefinedGraphOption } from '@milaboratories/graph-maker';
import { GraphMaker } from '@milaboratories/graph-maker';

const app = useApp();
const settingsOpen = ref(true);

function setInput(inputRef?: PlRef) {
  app.model.args.countsRef = inputRef;
  if (inputRef)
    app.model.args.title = app.model.outputs.countsOptions?.find((o) => plRefsEqual(o.ref, inputRef))?.label;
  else
    app.model.args.title = undefined;
}

function getDefaultOptions(umapDefaults?: PColumnIdAndSpec[]) {
  if (!umapDefaults) {
    return undefined;
  }

  function getIndex(name: string, pcols: PColumnIdAndSpec[]): number {
    return pcols.findIndex((p) => p.spec.name === name);
  }

  const defaults: PredefinedGraphOption<'scatterplot-umap'>[] = [
    {
      inputName: 'x',
      selectedSource: umapDefaults[getIndex('pl7.app/rna-seq/umap1',
        umapDefaults)].spec,
    },
    {
      inputName: 'y',
      selectedSource: umapDefaults[getIndex('pl7.app/rna-seq/umap2',
        umapDefaults)].spec,
    },
    {
      inputName: 'grouping',
      selectedSource: umapDefaults[getIndex('pl7.app/rna-seq/umap1',
        umapDefaults)].spec.axesSpec[0],
    },
  ];

  return defaults;
}

const defaultOptions = ref(getDefaultOptions(app.model.outputs.umapDefaults));
const key = ref(defaultOptions.value ? JSON.stringify(defaultOptions.value) : '');

</script>

<template>
  <PlBlockPage>
    <GraphMaker
      :key="key"
      v-model="app.model.ui.graphStateUMAP"
      chartType="scatterplot-umap"
      :p-frame="app.model.outputs.UMAPPf"
      :default-options="defaultOptions"
      @run="settingsOpen = false"
    >
      <template v-if="settingsOpen" #settingsSlot>
        <PlDropdownRef
          v-model="app.model.args.countsRef"
          :options="app.model.outputs.countsOptions"
          :style="{ width: '320px' }"
          label="Select dataset"
          clearable
          required
          @update:model-value="setInput"
        />
      </template>
    </GraphMaker>
  </PlBlockPage>
</template>

<style scoped>
.settings-content {
  padding: 16px;
}
</style>
