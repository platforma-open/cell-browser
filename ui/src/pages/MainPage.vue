<script setup lang="ts">
import '@milaboratories/graph-maker/styles';
import { PlBlockPage, PlDropdownRef } from '@platforma-sdk/ui-vue';
import { useApp } from '../app';
import { plRefsEqual } from '@platforma-sdk/model';
import type { PlRef } from '@platforma-sdk/model';

const app = useApp();

// // const settingsAreShown = ref(app.model.outputs.UMAPPf === undefined)
// const settingsAreShown = ref(true);
// const showSettings = () => {
//   settingsAreShown.value = true;
// };

function setInput(inputRef?: PlRef) {
  app.model.args.countsRef = inputRef;
  if (inputRef)
    app.model.args.title = app.model.outputs.countsOptions?.find((o) => plRefsEqual(o.ref, inputRef))?.label;
  else
    app.model.args.title = undefined;
}

</script>

<template>
  <PlBlockPage>
    <template #title>Settings</template>
    <!-- <template #append>
      <PlBtnGhost @click.stop="showSettings">
        Settings
        <template #append>
          <PlMaskIcon24 name="settings" />
        </template>
      </PlBtnGhost>
    </template> -->
    <PlDropdownRef
      v-model="app.model.args.countsRef" :options="app.model.outputs.countsOptions"
      :style="{ width: '320px' }"
      label="Select dataset"
      clearable @update:model-value="setInput"
    />

    <!-- <PlSlideModal v-model="settingsAreShown">
      <template #title>Settings</template>
      <PlDropdownRef
        v-model="app.model.args.countsRef" :options="app.model.outputs.countsOptions"
        label="Select dataset"
        clearable
      />
    </PlSlideModal> -->
  </PlBlockPage>
</template>
