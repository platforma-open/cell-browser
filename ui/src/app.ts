import { model } from '@platforma-open/milaboratories.cell-browser.model';
import { defineApp } from '@platforma-sdk/ui-vue';
import MainPage from './pages/MainPage.vue';
import UMAP from './pages/UMAP.vue';
import ViolinPage from './pages/ViolinPage.vue';
import heatmapPage from './pages/heatmapPage.vue';

export const sdkPlugin = defineApp(model, () => {
  return {
    routes: {
      '/': () => MainPage,
      '/umap': () => UMAP,
      '/violin': () => ViolinPage,
      '/heatmap': () => heatmapPage,
    },
  };
});

export const useApp = sdkPlugin.useApp;
