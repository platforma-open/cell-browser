<script setup lang="ts">

import {
  PlAgDataTableV2,
  PlBlockPage,
  PlBtnGhost,
  usePlDataTableSettingsV2,
} from '@platforma-sdk/ui-vue';
import { useApp } from '../app';
import AnnotationModal from './AnnotationModal.vue';

const app = useApp();

const tableSettings = usePlDataTableSettingsV2({
  sourceId: () => app.model.args.countsRef,
  model: () => app.model.outputs.overlapTable,
});
</script>

<template>
  <PlBlockPage>
    <template #title>
      Cell Browser
    </template>
    <template #append>
      <PlBtnGhost icon="annotate" @click.stop="app.isAnnotationModalOpen = true">
        Annotations
      </PlBtnGhost>
      <PlBtnGhost icon="settings" @click.exact.stop="app.model.ui.settingsOpen = true">
        Settings
      </PlBtnGhost>
    </template>
    <PlAgDataTableV2
      ref="tableInstance"
      v-model="app.model.ui.overlapTable.tableState"
      :settings="tableSettings"
    />
  </PlBlockPage>
  <AnnotationModal />
</template>
