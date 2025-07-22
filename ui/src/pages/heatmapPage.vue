<script setup lang="ts">
import type { PredefinedGraphOption } from '@milaboratories/graph-maker';
import { GraphMaker } from '@milaboratories/graph-maker';
import '@milaboratories/graph-maker/styles';
import { ref } from 'vue';
import { useApp } from '../app';
import type { PColumnIdAndSpec } from '@platforma-sdk/model';

const app = useApp();

function getDefaultOptions(violinExprPfDefaults?: PColumnIdAndSpec[]) {
  if (!violinExprPfDefaults) {
    return undefined;
  }

  function getIndex(name: string, pcols: PColumnIdAndSpec[]): number {
    return pcols.findIndex((p) => p.spec.name === name);
  }

  const countMatrixIndex = getIndex('pl7.app/rna-seq/countMatrix', violinExprPfDefaults);
  const labelIndex = getIndex('pl7.app/label', violinExprPfDefaults);
  const degIndex = getIndex('pl7.app/rna-seq/DEG', violinExprPfDefaults);
  
  if (countMatrixIndex === -1) {
    return undefined;
  }

  const defaults: PredefinedGraphOption<'heatmap'>[] = [
    {
      // Gene count values - needs PColumn spec (kind: "column")
      inputName: 'value',
      selectedSource: violinExprPfDefaults[countMatrixIndex].spec,
    },
    {
      // Cell Barcode ID as X axis - needs axis spec (kind: "axis")
      inputName: 'x',
      selectedSource: violinExprPfDefaults[countMatrixIndex].spec.axesSpec[1], // cellId
    },
    {
      // Sample ID as second X axis - needs axis spec (kind: "axis")
      inputName: 'x',
      selectedSource: violinExprPfDefaults[countMatrixIndex].spec.axesSpec[0], // sampleId
    },
    {
      // Gene ID as Y axis - needs axis spec (kind: "axis")
      inputName: 'y',
      selectedSource: violinExprPfDefaults[countMatrixIndex].spec.axesSpec[2], // geneId
    },
  ];

  // Add cluster grouping - xGroupBy needs leiden cluster PColumn spec (kind: "column")
  defaults.push({
    // Leiden Cluster ID as x-group-by
    inputName: 'xGroupBy',
    selectedSource: {
      kind: 'PColumn',
      name: 'pl7.app/rna-seq/leidencluster',
      valueType: 'String',
      axesSpec: [],
    },
  });

  // Add leiden cluster to annotationsX
  defaults.push({
    // Leiden Cluster ID as x-annotation
    inputName: 'annotationsX',
    selectedSource: {
      kind: 'PColumn',
      name: 'pl7.app/rna-seq/leidencluster',
      valueType: 'String',
      axesSpec: [],
    },
  });

  // Add default filter if DEG columns are available - filters need PColumn spec (kind: "column")
  if (degIndex !== -1) {
    defaults.push({
      // DEG gene list (if present) as filter
      inputName: 'filters',
      selectedSource: violinExprPfDefaults[degIndex].spec,
    });
  }

  return defaults;
}

const defaultOptions = ref(getDefaultOptions(app.model.outputs.violinExprPfDefaults));

</script>

<template>
  <GraphMaker
    v-model="app.model.ui.heatmapState"
    chartType="heatmap"
    :p-frame="app.model.outputs.ExprPf"
    :default-options="defaultOptions"
  />
</template>
