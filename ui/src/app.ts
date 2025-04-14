import { model } from '@platforma-open/milaboratories.cell-browser.model';
import { defineApp } from '@platforma-sdk/ui-vue';
import MainPage from './pages/MainPage.vue';
import UMAP from './pages/UMAP.vue';

export const sdkPlugin = defineApp(model, () => {
  return {
    routes: {
      '/': () => MainPage,
      '/umap': () => UMAP,
    },
  };
});

export const useApp = sdkPlugin.useApp;
