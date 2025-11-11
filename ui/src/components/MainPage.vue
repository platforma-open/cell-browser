<script setup lang="ts">
import '@milaboratories/graph-maker/styles';
import { plRefsEqual, type PColumnIdAndSpec, type PlRef } from '@platforma-sdk/model';
import { PlAnnotations, PlBlockPage, PlDropdownRef } from '@platforma-sdk/ui-vue';
import { computed, ref } from 'vue';
import { useApp } from '../app';

import type { PredefinedGraphOption } from '@milaboratories/graph-maker';
import { GraphMaker } from '@milaboratories/graph-maker';
import { getDefaultAnnotationScript } from '../utils';

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

  const getDefaultSource = (name: string) => {
    const spec = umapDefaults[getIndex(name, umapDefaults)].spec;
    return {
      ...spec,
      annotations: undefined,
    };
  }; // annotation contains changed labels, so with them we search here only columns with long modified labels

  const defaults: PredefinedGraphOption<'scatterplot-umap'>[] = [
    {
      inputName: 'x',
      selectedSource: getDefaultSource('pl7.app/rna-seq/umap1'),
    },
    {
      inputName: 'y',
      selectedSource: getDefaultSource('pl7.app/rna-seq/umap2'),
    },
    {
      inputName: 'grouping',
      selectedSource: getDefaultSource('pl7.app/rna-seq/umap1').axesSpec[0],
    },
  ];

  return defaults;
}

const defaultOptions = computed(() => getDefaultOptions(app.model.outputs.umapDefaults));
const key = computed(() => defaultOptions.value ? JSON.stringify(defaultOptions.value) : '');

function handleDeleteSchema() {
  Object.assign(app.model.ui.annotationSpec, getDefaultAnnotationScript());
}

function handleRun() {
  console.log('run?');
  settingsOpen.value = false;
}

</script>

<template>
  <PlBlockPage>
    <GraphMaker
      v-model="app.model.ui.graphStateUMAP"
      :class="$style.graphMaker"
      :dataStateKey="key"
      chartType="scatterplot-umap"
      :p-frame="app.model.outputs.UMAPPf"
      :default-options="defaultOptions"
      @run="handleRun"
    >
      <template v-if="settingsOpen" #settingsSlot>
        <PlDropdownRef
          v-model="app.model.args.countsRef"
          :class="$style.settings"
          :options="app.model.outputs.countsOptions"
          label="Select dataset"
          clearable
          required
          @update:model-value="setInput"
        />
      </template>
      <template #annotationsSlot>
        <PlAnnotations
          v-model:annotation="app.model.ui.annotationSpec"
          :class="$style.annotations"
          :columns="app.model.outputs.overlapColumns ?? []"
          :onDeleteSchema="handleDeleteSchema"
        />
      </template>
    </GraphMaker>
  </PlBlockPage>
</template>

<style module>
.graphMaker :global(.annotations-form) {
  width: 100%;
  height: 100%;
}

.settings {
  width: 320px;
}

.annotations {
  display: flex;
  width: 768px;
}
</style>
