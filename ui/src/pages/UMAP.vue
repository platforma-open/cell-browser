<script setup lang="ts">
import '@milaboratories/graph-maker/styles';
import { PlBlockPage } from '@platforma-sdk/ui-vue';
import { useApp } from '../app';

import type { PredefinedGraphOption } from '@milaboratories/graph-maker';
import { GraphMaker } from '@milaboratories/graph-maker';

const app = useApp();

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
    <GraphMaker v-model="app.model.ui.graphStateUMAP" chartType="scatterplot-umap" :p-frame="app.model.outputs.UMAPPf" :default-options="defaultOptions" />
  </PlBlockPage>
</template>
