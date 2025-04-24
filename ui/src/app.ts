import { model } from '@platforma-open/milaboratories.cell-browser.model';
import { defineApp } from '@platforma-sdk/ui-vue';
import MainPage from './pages/MainPage.vue';
import UMAP from './pages/UMAP.vue';
import GraphPage from './pages/GraphPage.vue';

export const sdkPlugin = defineApp(model, () => {
  return {
    routes: {
      '/': () => MainPage,
      '/umap': () => UMAP,
      '/graph': () => GraphPage,
    },
  };
});

export const useApp = sdkPlugin.useApp;
