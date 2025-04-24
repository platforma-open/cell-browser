<script setup lang="ts">
import type { GraphMakerProps } from '@milaboratories/graph-maker';
import { GraphMaker } from '@milaboratories/graph-maker';
import '@milaboratories/graph-maker/styles';
import { ref } from 'vue';
import { useApp } from '../app';
import type { PColumnIdAndSpec } from '@platforma-sdk/model';

// import '@milaboratories/graph-maker/styles';

const app = useApp();

function getDefaultOptions(violinExprPfDefaults?: PColumnIdAndSpec[]) {
  if (!violinExprPfDefaults) {
    return undefined;
  }

  function getIndex(name: string, pcols: PColumnIdAndSpec[]): number {
    return pcols.findIndex((p) => p.spec.name === name);
  }

  const defaults: GraphMakerProps['defaultOptions'] = [
    {
      inputName: 'y',
      selectedSource: violinExprPfDefaults[getIndex('pl7.app/rna-seq/countMatrix',
        violinExprPfDefaults)].spec,
    },
    {
      inputName: 'primaryGrouping',
      selectedSource: violinExprPfDefaults[getIndex('pl7.app/label',
        violinExprPfDefaults)].spec,
    },
    {
      inputName: 'filters',
      selectedSource: violinExprPfDefaults[getIndex('pl7.app/rna-seq/geneSymbols',
        violinExprPfDefaults)].spec,
    },
  ];

  return defaults;
}

const defaultOptions = ref(getDefaultOptions(app.model.outputs.violinExprPfDefaults));

</script>

<template>
  <GraphMaker
    v-model="app.model.ui.graphStateViolin" chartType="discrete"
    :p-frame="app.model.outputs.violinExprPf" :default-options="defaultOptions"
  />
</template>
