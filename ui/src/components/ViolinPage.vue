<script setup lang="ts">
import type { PredefinedGraphOption } from '@milaboratories/graph-maker';
import { GraphMaker } from '@milaboratories/graph-maker';
import type { PColumnIdAndSpec } from '@platforma-sdk/model';
import { ref } from 'vue';
import { useApp } from '../app';

const app = useApp();

function getDefaultOptions(violinExprPfDefaults?: PColumnIdAndSpec[]) {
  if (!violinExprPfDefaults) {
    return undefined;
  }

  function getIndex(name: string, pcols: PColumnIdAndSpec[]): number {
    return pcols.findIndex((p) => p.spec.name === name);
  }

  const defaults: PredefinedGraphOption<'discrete'>[] = [
    {
      inputName: 'y',
      selectedSource: violinExprPfDefaults[getIndex('pl7.app/rna-seq/countMatrix',
        violinExprPfDefaults)].spec,
    },
    {
      inputName: 'primaryGrouping',
      selectedSource: violinExprPfDefaults[getIndex('pl7.app/rna-seq/countMatrix',
        violinExprPfDefaults)].spec.axesSpec[0], // sampleId
    },
    {
      inputName: 'filters',
      selectedSource: violinExprPfDefaults[getIndex('pl7.app/rna-seq/countMatrix',
        violinExprPfDefaults)].spec.axesSpec[2], // geneId
    },
  ];

  return defaults;
}

const defaultOptions = ref(getDefaultOptions(app.model.outputs.violinExprPfDefaults));

</script>

<template>
  <GraphMaker
    v-model="app.model.ui.graphStateViolin" chartType="discrete"
    :p-frame="app.model.outputs.ExprPf" :default-options="defaultOptions"
  />
</template>
