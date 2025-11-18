<script setup lang="ts">
import { canonicalizeAxisId, getAxisId, parseColumnId } from '@platforma-sdk/model';
import { PlAnnotationsModal } from '@platforma-sdk/ui-vue';
import { computed, effect } from 'vue';
import { useApp } from '../app';
import { ColumnsProvider, getUniqueSourceValuesWithLabels } from '../suggestion';
import { getDefaultAnnotationScript } from '../utils';
import AnnotationCreateDialog from './AnnotationCreateDialog.vue';

const app = useApp();

// State
const hasAnnotation = computed(() => app.model.ui.annotationSpec.isCreated === true);

const openedDialog = computed({
  get: () => !hasAnnotation.value && app.isAnnotationModalOpen,
  set: (value: boolean) => (app.isAnnotationModalOpen = value),
});
const openedModal = computed({
  get: () => hasAnnotation.value && app.isAnnotationModalOpen,
  set: (value: boolean) => (app.isAnnotationModalOpen = value),
});

// Actions
function handleCreateAnnotation(props: { title: string }) {
  app.model.ui.annotationSpec.isCreated = true;
  app.model.ui.annotationSpec.title = props.title;
  app.model.ui.annotationSpec.steps = [];
}

function handleDeleteSchema() {
  Object.assign(app.model.ui.annotationSpec, getDefaultAnnotationScript());
}

const provider = computed(() => app.model.outputs.overlapColumnsPf
  ? new ColumnsProvider(app.model.outputs.overlapColumnsPf, app.pFrameDriver)
  : null,
);

effect(async () => {
  const providerValue = provider.value;
  const anchorAxesSpecs = app.model.outputs.anchorAxesSpecs;
  const annotationsAxesSpecs = app.model.outputs.annotationsAxesSpecs;
  if (providerValue == null || anchorAxesSpecs == null || annotationsAxesSpecs == null) return;
  const filter = app.model.ui.annotationSpec.steps[0]?.filter.filters[0];
  const columnId = 'column' in filter ? filter?.column : undefined;
  if (columnId == null) return;
  const column = columnId === undefined ? undefined : parseColumnId(columnId);
  if (column == null) return;
  const columnAxes = column && 'axes' in column ? column.axes : undefined;
  if (columnAxes == null) return;
  const axesIds = columnAxes.flatMap((columnAxis, i) => {
    let axisId = 'type' in columnAxis ? columnAxis : undefined;

    if (axisId == null && 'idx' in columnAxis) {
      const idx = columnAxis.idx;
      axisId = anchorAxesSpecs[idx] ? getAxisId(anchorAxesSpecs[idx]) : undefined;
    }

    if (axisId == null) return [];

    const canonicalAxisId = canonicalizeAxisId(axisId);
    return annotationsAxesSpecs.some((axis) => canonicalizeAxisId(getAxisId(axis)) === canonicalAxisId)
      ? []
      : [i];
  });

  if (providerValue && columnId && axesIds.length > 0) {
    axesIds.forEach(async (axisIdx) => {
      const value = await getUniqueSourceValuesWithLabels(providerValue, {
        columnId: columnId,
        axisIdx: axisIdx,
        limit: 100,
      // searchQuery: 'ICR',
      });
      console.log('axisId:', axisIdx, value);
    });
  }
});

</script>

<template>
  <AnnotationCreateDialog
    v-model:opened="openedDialog"
    :onSubmit="handleCreateAnnotation"
  />
  <PlAnnotationsModal
    v-model:opened="openedModal"
    v-model:annotation="app.model.ui.annotationSpec"
    :columns="app.model.outputs.overlapColumns ?? []"
    :onDeleteSchema="handleDeleteSchema"
  />
</template>
