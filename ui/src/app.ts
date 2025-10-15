import type { Platforma } from '@platforma-open/milaboratories.wip-cell-browser.model';
import { platforma } from '@platforma-open/milaboratories.wip-cell-browser.model';
import { defineApp } from '@platforma-sdk/ui-vue';
import { ref } from 'vue';
import MainPage from './components/MainPage.vue';
import { processAnnotationUiStateToArgsState } from './model';

export const sdkPlugin = defineApp(platforma as Platforma, (app) => {
  processAnnotationUiStateToArgsState(
    () => app.model.ui.annotationSpec,
    () => app.model.args.annotationSpec,
  );

  const isAnnotationModalOpen = ref(false);

  return {
    isAnnotationModalOpen,
    routes: {
      '/': () => MainPage,
    },
  };
}, { debug: false });

export const useApp = sdkPlugin.useApp;
