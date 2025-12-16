import type { Platforma } from '@platforma-open/milaboratories.cell-browser-2.model';
import { platforma } from '@platforma-open/milaboratories.cell-browser-2.model';
import { defineApp } from '@platforma-sdk/ui-vue';
import { ref } from 'vue';
import { processAnnotationUiStateToArgsState } from './model';

import type { PFrameDriver } from '@platforma-sdk/model';
import AnnotationPage from './components/AnnotationPage.vue';
import AnnotationStatsBySamplePage from './components/AnnotationStatsBySamplePage.vue';
import AnnotationStatsPage from './components/AnnotationStatsPage.vue';
import MainPage from './components/MainPage.vue';
import ViolinPage from './components/ViolinPage.vue';
import { setDefaultUiState, throwingError } from './utils';

export const sdkPlugin = defineApp(platforma as Platforma, (app) => {
  setDefaultUiState(app.model);

  processAnnotationUiStateToArgsState(
    () => app.model.ui.annotationSpec,
    () => app.model.args.annotationSpec,
  );

  const isAnnotationModalOpen = ref(false);

  const pFrameDriver = (('platforma' in window) ? window.platforma?.pFrameDriver : throwingError('Platforma SDK is not found')) as PFrameDriver;

  return {
    pFrameDriver,
    isAnnotationModalOpen,
    progress: () => app.model.outputs.annotationsIsComputing,
    routes: {
      '/': () => MainPage,
      '/violin': () => ViolinPage,
      // '/heatmaps': () => MainPage,
      '/annotations': () => AnnotationPage,
      '/annotations-stats': () => AnnotationStatsPage,
      '/annotations-stats-by-sample': () => AnnotationStatsBySamplePage,
    },
  };
}, { debug: false });

export const useApp = sdkPlugin.useApp;
