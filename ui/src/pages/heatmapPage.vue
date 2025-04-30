<script setup lang="ts">
import { GraphMaker, GraphMakerProps, PredefinedGraphOption } from "@milaboratories/graph-maker";
import '@milaboratories/graph-maker/styles';
import { useApp } from '../app';
import { computed } from 'vue';

const app = useApp();

const defaultOptions = computed((): GraphMakerProps['defaultOptions'] => {
  if (!app.model.outputs.countsSpec) // will change the name, its actually the countsRef
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
      // Gene ID as Y axis
      inputName: 'y',
      selectedSource: app.model.outputs.countsSpec.axesSpec[2],
    },
    {
      // Sample as x group axis
      inputName: 'xGroupBy',
      selectedSource: app.model.outputs.countsSpec.axesSpec[0],
    },
  ];
  // Add default filter only if there is at least a DEG Pcolumn
  if (app.model.outputs.DEGpf // Again its actually a log2fold change pcol subset for testing, seems to not work. Because of axes?
    && app.model.outputs.DEGpf.length !== 0) {
    // Extend default options
    defaults.push({
      // DEG gene list (if present) as filter
      inputName: 'filters',
      selectedSource: app.model.outputs.DEGpf[0].spec,
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
