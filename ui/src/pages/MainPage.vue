<script setup lang="ts">
import '@milaboratories/graph-maker/styles';
import { PlBlockPage, PlDropdownRef } from '@platforma-sdk/ui-vue';
import { useApp } from '../app';
import { plRefsEqual } from '@platforma-sdk/model';
import type { PlRef } from '@platforma-sdk/model';
import { ref } from 'vue';

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

const defaultOptions: PredefinedGraphOption<'scatterplot-umap'>[] = [
  {
    inputName: 'x',
    selectedSource: {
      kind: 'PColumn',
      name: 'pl7.app/rna-seq/umap1',
      valueType: 'Double',
      axesSpec: [
        {
          name: 'pl7.app/sampleId',
          type: 'String',
        },
        {
          name: 'pl7.app/cellId',
          type: 'String',
        },
      ],
    },
  },
  {
    inputName: 'y',
    selectedSource: {
      kind: 'PColumn',
      name: 'pl7.app/rna-seq/umap2',
      valueType: 'Double',
      axesSpec: [
        {
          name: 'pl7.app/sampleId',
          type: 'String',
        },
        {
          name: 'pl7.app/cellId',
          type: 'String',
        },
      ],
    },
  },
  {
    inputName: 'grouping',
    selectedSource: {
      name: 'pl7.app/sampleId',
      type: 'String',
    },
  },
];

</script>

<template>
  <PlBlockPage>
    <GraphMaker
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
