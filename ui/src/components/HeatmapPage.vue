<script setup lang="ts">
import type { PredefinedGraphOption } from '@milaboratories/graph-maker';
import { GraphMaker } from '@milaboratories/graph-maker';
import '@milaboratories/graph-maker/styles';
import type { PColumnIdAndSpec } from '@platforma-sdk/model';
import { computed } from 'vue';
import { useApp } from '../app';

const app = useApp();

// Reactive computed property using violinExprPfDefaults (which contains normalized expression data)
const defaultOptions = computed(() => {
  const violinExprPfDefaults = app.model.outputs.violinExprPfDefaults;
  if (!violinExprPfDefaults) {
    return undefined;
  }

  function getIndex(name: string, pcols: PColumnIdAndSpec[]): number {
    return pcols.findIndex((p) => p.spec.name === name);
  }

  const countMatrixIndex = getIndex('pl7.app/rna-seq/countMatrix', violinExprPfDefaults);
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
  const leidenIndex = getIndex('pl7.app/rna-seq/leidencluster', violinExprPfDefaults);
  if (leidenIndex !== -1) {
    defaults.push({
      // Leiden Cluster ID as x-group-by
      inputName: 'xGroupBy',
      selectedSource: violinExprPfDefaults[leidenIndex].spec,
    });

    // Add leiden cluster to annotationsX
    defaults.push({
      // Leiden Cluster ID as x-annotation
      inputName: 'annotationsX',
      selectedSource: violinExprPfDefaults[leidenIndex].spec,
    });
  }

  // Add default filter if DEG columns are available - filters need PColumn spec (kind: "column")
  if (degIndex !== -1) {
    defaults.push({
      // DEG gene list (log2FC values) as filter
      inputName: 'filters',
      selectedSource: violinExprPfDefaults[degIndex].spec,
    });
    defaults.push({
      inputName: 'filters',
      selectedSource: violinExprPfDefaults[degIndex].spec.axesSpec[0], // Cluster
    });
  }

  return defaults;
});

</script>

<template>
  <GraphMaker
    v-model="app.model.ui.heatmapState" chartType="heatmap" :p-frame="app.model.outputs.ExprPf"
    :default-options="defaultOptions"
  />
</template>
