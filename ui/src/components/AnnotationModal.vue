<script setup lang="ts">
import { PlAnnotationsModal } from '@platforma-sdk/ui-vue';
import { useApp } from '../app';
import { useColumnSuggestion } from '../composition/useColumnSuggestion';
import { getDefaultAnnotationScript } from '../utils';

const app = useApp();
const suggest = useColumnSuggestion();

function handleDeleteSchema() {
  Object.assign(app.model.ui.annotationSpec, getDefaultAnnotationScript());
}
</script>

<template>
  <PlAnnotationsModal
    v-model:opened="app.isAnnotationModalOpen"
    v-model:annotation="app.model.ui.annotationSpec"
    :columns="app.model.outputs.overlapColumns?.filterOptions ?? []"
    :getSuggestOptions="suggest"
    :onDeleteSchema="handleDeleteSchema"
  />
</template>
