import type { AnnotationSpecUi, UiState } from '@platforma-open/milaboratories.wip-cell-browser.model';
import { createPlDataTableStateV2 } from '@platforma-sdk/model';

export function getDefaultAnnotationScript(): AnnotationSpecUi {
  return {
    title: '',
    steps: [],
  };
}

const DEFAULT_UI_STATE: UiState = {
  settingsOpen: true,
  overlapTable: {
    tableState: createPlDataTableStateV2(),
  },
  statsTable: {
    tableState: createPlDataTableStateV2(),
  },
  statsBySampleTable: {
    tableState: createPlDataTableStateV2(),
  },
  annotationSpec: {
    title: '',
    steps: [],
  } satisfies AnnotationSpecUi,
  graphStateUMAP: {
    title: 'UMAP',
    template: 'dots',
    currentTab: 'settings',
  },
  graphStateViolin: {
    template: 'violin',
    title: 'Gene Expression',
    layersSettings: {
      violin: {
        fillColor: '#99E099',
      },
    },
  },
  heatmapState: {
    template: 'heatmapClustered',
    title: 'Expression Heatmap',
    layersSettings: {
      heatmapClustered: {
        normalizationDirection: null,
        dendrogramX: false,
        dendrogramY: false,
      },
    },
  },
};

export function setDefaultUiState(model: { ui: UiState }) {
  Object.assign(model.ui, { ...DEFAULT_UI_STATE, ...model.ui });
}

export function throwingError(content: Error | string): never {
  if (content instanceof Error) {
    throw content;
  } else {
    throw new Error(content);
  }
}
