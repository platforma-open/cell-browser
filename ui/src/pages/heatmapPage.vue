<script setup lang="ts">
import { GraphMaker, GraphMakerProps, PredefinedGraphOption } from "@milaboratories/graph-maker";
import '@milaboratories/graph-maker/styles';
import { computed } from 'vue';
import { useApp } from '../app';

const app = useApp();

const defaultOptions = computed((): GraphMakerProps['defaultOptions'] => {
  if (!app.model.outputs.countsSpec)
    return undefined;

  const defaults: PredefinedGraphOption<'heatmap'>[] = [
    {
      // Gene count values as Data Source
      inputName: 'value',
      selectedSource: app.model.outputs.countsSpec,
    },
    {
      // Cell Barcode ID as X axis
      inputName: 'x',
      selectedSource: app.model.outputs.countsSpec.axesSpec[1],
    },
    {
      // Sample ID also needed in X axis. Because cluster ID includes sample ID as axis
      inputName: 'x',
      selectedSource: app.model.outputs.countsSpec.axesSpec[0],
    },
    {
      // Gene ID as Y axis
      inputName: 'y',
      selectedSource: app.model.outputs.countsSpec.axesSpec[2],
    },
    {
      // Cluster ID as x-group-by axis
      inputName: 'xGroupBy',
      selectedSource: {
        kind: 'PColumn',
        name: 'pl7.app/rna-seq/leidencluster',
        valueType: 'String',
        axesSpec: [],
      },
    },
  ];
  // Add default filter only if there is at least a DEG subset Pcolumn
  if (app.model.outputs.DEGpf
    && app.model.outputs.DEGpf.length !== 0) {
    // Extend default options
    defaults.push({
      // DEG gene list (if present) as filter
      inputName: 'filters',
      selectedSource: app.model.outputs.DEGpf[0].spec,
      // Set default filter to a specific cluster (else, will be set automatically)
      /* fixedAxes: [{
        axisIdx: 0,
        axisValue: '0',
      }], */
    });
  }

  return defaults;
});

</script>

<template>
  <GraphMaker
    v-model="app.model.ui.heatmapState" chartType="heatmap" :p-frame="app.model.outputs.ExprPf"
    :defaultOptions="defaultOptions"
  />
</template>
