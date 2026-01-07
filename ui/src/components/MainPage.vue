<script setup lang="ts">
import '@milaboratories/graph-maker/styles';
import { plRefsEqual, type PColumnIdAndSpec, type PlRef } from '@platforma-sdk/model';
import { PlAnnotations, PlBlockPage, PlDropdownRef, PlTabs } from '@platforma-sdk/ui-vue';
import { computed, ref } from 'vue';
import { useApp } from '../app';

import type { PredefinedGraphOption } from '@milaboratories/graph-maker';
import { GraphMaker } from '@milaboratories/graph-maker';
import { useColumnSuggestion } from '../composition/useColumnSuggestion';
import { getDefaultAnnotationScript } from '../utils';

const app = useApp();
const suggest = useColumnSuggestion();
const currentTab = ref<('umap' | 'tsne')>('umap');

const tabOptions = [
  { label: 'UMAP', value: 'umap' },
  { label: 't-SNE', value: 'tsne' },
];

function setInput(inputRef?: PlRef) {
  app.model.args.countsRef = inputRef;
  if (inputRef)
    app.model.args.title = app.model.outputs.countsOptions?.find((o) => plRefsEqual(o.ref, inputRef))?.label;
  else
    app.model.args.title = undefined;
}

function handleDeleteSchema() {
  Object.assign(app.model.ui.annotationSpec, getDefaultAnnotationScript());
}

function getDefaultSource(cols: PColumnIdAndSpec[], name: string) {
  const index = cols.findIndex((p) => (p.spec.name === name));
  if (index === -1) return undefined;

  const spec = cols[index]?.spec;
  if (!spec) return undefined;

  return {
    ...spec,
    // annotation contains changed labels, so with them we search here only columns with long modified labels
    annotations: undefined,
  };
}

function getDefaultOptions(cols: PColumnIdAndSpec[], coord1Name: string, coord2Name: string) {
  if (!cols || cols.length === 0) {
    return undefined;
  }

  const source1 = getDefaultSource(cols, coord1Name);
  const source2 = getDefaultSource(cols, coord2Name);

  if (source1 == null || source2 == null) {
    return undefined;
  }

  const result: PredefinedGraphOption<'scatterplot-umap'>[] = [
    {
      inputName: 'x',
      selectedSource: source1,
    },
    {
      inputName: 'y',
      selectedSource: source2,
    },
    {
      inputName: 'grouping',
      selectedSource: source1.axesSpec[0],
    },
  ];

  return result;
}

const graphState = computed({
  get: () => currentTab.value === 'umap' ? app.model.ui.graphStateUMAP : app.model.ui.graphStateTSNE,
  set: (value) => {
    if (currentTab.value === 'umap')
      app.model.ui.graphStateUMAP = value;
    else
      app.model.ui.graphStateTSNE = value;
  },
});

const defaultOptions = computed((): PredefinedGraphOption<'scatterplot-umap'>[] | undefined => {
  if (!app.model.outputs.umapPColumns) return undefined;

  if (currentTab.value === 'umap') {
    return getDefaultOptions(
      app.model.outputs.umapPColumns,
      'pl7.app/rna-seq/umap1',
      'pl7.app/rna-seq/umap2',
    );
  }
  if (currentTab.value === 'tsne') {
    return getDefaultOptions(
      app.model.outputs.umapPColumns,
      'pl7.app/rna-seq/tsne1',
      'pl7.app/rna-seq/tsne2',
    );
  }
  return undefined;
});
const key = computed(() => {
  const a = defaultOptions.value ? JSON.stringify(defaultOptions.value) : '';
  console.log('>>', a);

  return a;
});

</script>

<template>
  <PlBlockPage>
    <GraphMaker
      v-if="defaultOptions != null"
      v-model="graphState as any"
      :class="$style.graphMaker"
      :dataStateKey="key"
      chartType="scatterplot-umap"
      :p-frame="app.model.outputs.UMAPPf"
      :default-options="defaultOptions"
    >
      <template #titleLineSlot>
        <PlTabs v-model="currentTab" :options="tabOptions" :style="{ display: 'flex', justifyContent: 'flex-end' }"/>
      </template>
      <template #settingsSlot>
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
          :columns="app.model.outputs.overlapColumns?.filterOptions ?? []"
          :getSuggestOptions="suggest"
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
  height: 100%;
}
</style>
