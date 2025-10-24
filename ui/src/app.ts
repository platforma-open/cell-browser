import type { Platforma } from '@platforma-open/milaboratories.wip-cell-browser.model';
import { platforma } from '@platforma-open/milaboratories.wip-cell-browser.model';
import { createPlDataTableStateV2 } from '@platforma-sdk/model';
import { defineApp } from '@platforma-sdk/ui-vue';
import { ref } from 'vue';
import AnnotationStatsPage from './components/AnnotationStatsPage.vue';
import MainPage from './components/MainPage.vue';
import { processAnnotationUiStateToArgsState } from './model';

export const sdkPlugin = defineApp(platforma as Platforma, (app) => {
  app.model.ui.statsTable ??= {
    tableState: createPlDataTableStateV2(),
  };

  processAnnotationUiStateToArgsState(
    () => app.model.ui.annotationSpec,
    () => app.model.args.annotationSpec,
  );

  const isAnnotationModalOpen = ref(false);

  return {
    isAnnotationModalOpen,
    routes: {
      '/': () => MainPage,
      '/stats': () => AnnotationStatsPage,
    },
  };
}, { debug: false });

export const useApp = sdkPlugin.useApp;
