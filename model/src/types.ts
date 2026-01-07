import type { GraphMakerState } from '@milaboratories/graph-maker';
import type { AnnotationSpecUi as _AnnotationSpecUi, FilterSpec as _FilterSpec, FilterSpecUi as _FilterSpecUI, FilterSpecLeaf, PlDataTableStateV2, PlRef } from '@platforma-sdk/model';
import type { AnnotationSpec as _AnnotationSpec } from '@platforma-sdk/model';

export type { FilterSpecType } from '@platforma-sdk/model';

export type FilterSpec = _FilterSpec<FilterSpecLeaf, { id: number; name?: string; isExpanded?: boolean }>;

export type FilterSpecUI = _FilterSpecUI<Extract<FilterSpec, { type: 'and' | 'or' }>> & { id: number };

export type AnnotationSpecUi = _AnnotationSpecUi<FilterSpecUI> & { defaultValue?: string };

export type AnnotationSpec = _AnnotationSpec & { defaultValue?: string };

export type BlockArgs = {
  title?: string;
  countsRef?: PlRef;
  annotationSpec: AnnotationSpec;
};

export type BlockUiState = {
  settingsOpen: boolean;
  overlapTable: {
    tableState: PlDataTableStateV2;
  };
  statsTable: {
    tableState: PlDataTableStateV2;
  };
  statsBySampleTable: {
    tableState: PlDataTableStateV2;
  };
  annotationSpec: AnnotationSpecUi;
  graphStateUMAP: GraphMakerState;
  graphStateTSNE: GraphMakerState;
  graphStateViolin: GraphMakerState;
  heatmapState: GraphMakerState;
};
