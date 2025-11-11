import type { GraphMakerState } from '@milaboratories/graph-maker';
import type {
  InferOutputsType,
  PColumnEntryUniversal,
  PColumnIdAndSpec,
  PColumnSpec,
  PFrameHandle,
  PlDataTableStateV2,
  PlRef,
  SimplifiedUniversalPColumnEntry,
} from '@platforma-sdk/model';
import {
  Annotation,
  BlockModel,
  createPFrameForGraphs,
  createPlDataTableSheet,
  createPlDataTableStateV2,
  createPlDataTableV2,
  getUniquePartitionKeys,
  isPColumn,
  isPColumnSpec,
  PColumnCollection,
  readAnnotationJson,
} from '@platforma-sdk/model';
import omit from 'lodash.omit';
import type { AnnotationSpec, AnnotationSpecUi } from './types';

type BlockArgs = {
  title?: string;
  countsRef?: PlRef;
  annotationSpec: AnnotationSpec;
};

export type UiState = {
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
  //
  graphStateUMAP: GraphMakerState;
  graphStateViolin: GraphMakerState;
  heatmapState: GraphMakerState;
};

const excludedAnnotationKeys = [
  'pl7.app/table/orderPriority',
  'pl7.app/table/visibility',
  'pl7.app/trace',
];

const simplifyColumnEntries = (
  entries: PColumnEntryUniversal[] | undefined,
): SimplifiedUniversalPColumnEntry[] | undefined => {
  if (!entries) {
    return undefined;
  }

  const ret = entries.map((entry) => {
    const filteredAnnotations = entry.spec.annotations
      ? omit(entry.spec.annotations, excludedAnnotationKeys)
      : undefined;

    return {
      id: entry.id,
      label: entry.label,
      axesSpec: entry.spec.axesSpec,
      obj: {
        valueType: entry.spec.valueType,
        annotations: filteredAnnotations,
      },
    };
  });

  ret.sort((a, b) => a.label.localeCompare(b.label));

  return ret;
};

export const platforma = BlockModel.create('Heavy')

  .withArgs<BlockArgs>({
    annotationSpec: {
      title: 'Cell Annotation',
      steps: [],
    },
  })

  .withUiState<UiState>({
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
      isCreated: false,
      title: 'Cell Annotation',
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
  })

  .output('inputOptions', (ctx) =>
    ctx.resultPool.getOptions([
      {
        axes: [
          { name: 'pl7.app/sampleId' },
          { name: 'pl7.app/sc/cellId' },
          { name: 'pl7.app/rna-seq/geneId' },
        ],
      },
    ], {
      refsWithEnrichments: true,
    }),
  )

  .output('overlapColumns', (ctx) => {
    if (ctx.args.countsRef === undefined)
      return undefined;
    const anchorCtx = ctx.resultPool.resolveAnchorCtx({ main: ctx.args.countsRef });
    if (!anchorCtx) return undefined;

    const entries = new PColumnCollection()
      .addColumnProvider(ctx.resultPool)
      .addAxisLabelProvider(ctx.resultPool)
      .getUniversalEntries(
        [
          {
            axes: [
              { anchor: 'main', idx: 0 }, // sampleId
              { anchor: 'main', idx: 1 }, // cellId
            ],
          },
          {
            axes: [
              { anchor: 'main', idx: 0 }, // sampleId
              { anchor: 'main', idx: 1 }, // cellId
              { anchor: 'main', idx: 2 }, // geneId
            ],
          },
        ],
        { anchorCtx },
      );

    return simplifyColumnEntries(entries);
  })

  .output('overlapTable', (ctx) => {
    if (ctx.args.countsRef === undefined)
      return undefined;

    const anchorCtx = ctx.resultPool.resolveAnchorCtx({ main: ctx.args.countsRef });
    if (!anchorCtx) return undefined;

    const collection = new PColumnCollection();

    const annotation = ctx.prerun?.resolve({ field: 'annotationsPf', assertFieldType: 'Input', allowPermanentAbsence: true })?.getPColumns();
    if (annotation) collection.addColumns(annotation);

    // result pool is added after the pre-run ouptus so that pre-run results take precedence
    collection
      .addColumnProvider(ctx.resultPool)
      .addAxisLabelProvider(ctx.resultPool);

    const columns = collection.getColumns(
      [
        {
          axes: [
            { anchor: 'main', idx: 0 }, // sampleId
            { anchor: 'main', idx: 1 }, // cellId
          ],
        },
      ],
      { anchorCtx },
    );

    if (!columns) return undefined;

    return createPlDataTableV2(
      ctx,
      columns,
      ctx.uiState.overlapTable.tableState,
    );
  })

  .output('statsTable', (ctx) => {
    const annotationStatsPf = ctx.prerun?.resolve({ field: 'annotationStatsPf', assertFieldType: 'Input', allowPermanentAbsence: true });
    const allColumns = annotationStatsPf?.getPColumns();

    if (allColumns == null || allColumns.length === 0) return undefined;

    const collection = new PColumnCollection()
      .addAxisLabelProvider(ctx.resultPool);

    for (const cols of allColumns) {
      collection.addColumn(cols);
    }

    const columns = collection.getColumns([{}]);

    if (columns === undefined) return undefined;

    return createPlDataTableV2(
      ctx,
      columns,
      ctx.uiState.statsTable.tableState,
    );
  })
  .output('statsBySampleTableModel', (ctx) => {
    const annotationStatsBySamplePf = ctx.prerun?.resolve({ field: 'annotationStatsBySamplePf', assertFieldType: 'Input', allowPermanentAbsence: true });
    const allColumns = annotationStatsBySamplePf?.getPColumns();

    if (allColumns == null || allColumns.length === 0) return undefined;

    const columns = new PColumnCollection()
      .addAxisLabelProvider(ctx.resultPool)
      .addColumns(allColumns)
      .getColumns({});
    // .getColumns({ axes: [{ split: true }, {}] });

    if (columns === undefined) return undefined;

    return createPlDataTableV2(
      ctx,
      columns,
      ctx.uiState.statsBySampleTable.tableState,
    );
  })
  .output('statsBySampleTableSheets', (ctx) => {
    const annotationStatsBySamplePf = ctx.prerun?.resolve({ field: 'annotationStatsBySamplePf', assertFieldType: 'Input', allowPermanentAbsence: true });
    const column = annotationStatsBySamplePf?.getPColumns()?.[0];

    if (!column) return undefined;

    const r = getUniquePartitionKeys(column.data);
    if (!r) return undefined;

    return r.map((values, i) => createPlDataTableSheet(ctx, column.spec.axesSpec[i], values));
  })

  .output('countsOptions', (ctx) =>
    ctx.resultPool.getOptions((spec) => isPColumnSpec(spec)
      && spec.name === 'pl7.app/rna-seq/countMatrix'
      && spec.domain?.['pl7.app/rna-seq/normalized'] === 'false'
      // && spec.annotations?.['pl7.app/hideDataFromGraphs'] !== 'true'
      , { includeNativeLabel: false, addLabelAsSuffix: true }),
  )

  .output('countsSpec', (ctx) => {
    // return the Reference of the p-column selected as input dataset in Settings
    if (!ctx.activeArgs?.countsRef) return undefined;

    // Get the specs of that selected p-column
    const countsColumn = ctx.resultPool.getPColumnByRef(ctx.activeArgs?.countsRef);
    const countsSpec = countsColumn?.spec;
    if (!countsSpec) {
      console.error('Anchor spec is undefined or is not PColumnSpec', countsSpec);
      return undefined;
    }

    return countsSpec;
  })

  .output('UMAPPf', (ctx): PFrameHandle | undefined => {
    // Build a PFrame consisting of all columns that can be associated with the selected countsRef anchor
    if (!ctx.args.countsRef) return undefined;

    const annotationsColumns = ctx.prerun?.resolve({ field: 'annotationsPf', assertFieldType: 'Input', allowPermanentAbsence: true })?.getPColumns() ?? [];
    const filtersColumns = ctx.prerun?.resolve({ field: 'filtersPf', assertFieldType: 'Input', allowPermanentAbsence: true })?.getPColumns() ?? [];
    const allColumns = [...annotationsColumns, ...filtersColumns];

    return createPFrameForGraphs(ctx, allColumns.length > 0 ? allColumns : undefined);
  })

  .output('umapDefaults', (ctx) => {
    // Build a PFrame consisting of all columns that can be associated with the selected countsRef anchor
    if (!ctx.args.countsRef) return undefined;

    // Use the SDK's anchored selection to gather all compatible columns for graphs
    const anchoredColumns = ctx.resultPool.getAnchoredPColumns(
      { countsRef: ctx.args.countsRef },
      // Capture all p-columns associated with the anchor; filtering is handled by SDK axis/anchor logic
      (_spec) => true,
      { dontWaitAllData: true },
    );

    if (!anchoredColumns || anchoredColumns.length === 0) return undefined;

    // Return batch corrected UMAP if present
    let finalPcols = anchoredColumns.filter((col) => col.spec.domain?.['pl7.app/rna-seq/batch-corrected'] === 'true');
    if (finalPcols.length === 0) {
      finalPcols = anchoredColumns.filter((col) => col.spec.domain?.['pl7.app/rna-seq/batch-corrected'] === 'false');
    }

    if (finalPcols.length === 0) return undefined;

    return finalPcols.map(
      (c) => ({
        columnId: c.id,
        spec: c.spec,
      } satisfies PColumnIdAndSpec),
    );
  })

  // @TODO - Currently createPFrameForGraphs is letting everything through. createPFrame used for now
  .output('ExprPf', (ctx): PFrameHandle | undefined => {
    let pCols = ctx.resultPool
      .getData()
      .entries.map((c) => c.obj)
      .filter(isPColumn)
      .filter((col) => col.spec.name === 'pl7.app/rna-seq/countMatrix');
    // && col.spec.annotations?.['pl7.app/hideDataFromGraphs'] !== 'true');
    if (pCols === undefined) {
      return undefined;
    }

    // Add sample labels and gene symbols
    const upstream = ctx.resultPool
      .getData()
      .entries.map((v) => v.obj)
      .filter(isPColumn)
      .filter((col) => col.spec.name === 'pl7.app/label'
        // || col.spec.name === 'pl7.app/rna-seq/geneSymbols'
        || col.spec.name === 'pl7.app/metadata'
        || col.spec.name === 'pl7.app/rna-seq/leidencluster'
        || col.spec.name === 'pl7.app/rna-seq/DEG',
      );

    pCols = [...pCols, ...upstream];

    return ctx.createPFrame(pCols);
  })

  // Pcolumns for violin plot defaults, filtered to only normalised
  .output('violinExprPfDefaults', (ctx) => {
    let pCols = ctx.resultPool
      .getData()
      .entries.map((o) => o.obj)
      .filter(isPColumn)
      .filter((col) => col.spec.name === 'pl7.app/rna-seq/countMatrix'
        && col.spec.domain?.['pl7.app/rna-seq/normalized'] === 'true');
    // && col.spec.annotations?.['pl7.app/hideDataFromGraphs'] !== 'true');
    if (pCols === undefined) return undefined;

    // Add sample labels and gene symbols
    const upstream = ctx.resultPool
      .getData()
      .entries.map((v) => v.obj)
      .filter(isPColumn)
      .filter((col) => col.spec.name === 'pl7.app/label'
        // Now geneSymbols have pl7.app/label, unnecessary
        // || col.spec.name === 'pl7.app/rna-seq/geneSymbols'
        || col.spec.name === 'pl7.app/rna-seq/DEG'
        || col.spec.name === 'pl7.app/rna-seq/leidencluster');

    pCols = [...pCols, ...upstream];

    return pCols.map(
      (c) => ({
        columnId: c.id,
        spec: c.spec,
      } satisfies PColumnIdAndSpec),
    );
  })

  // Get DEG pframe
  .output('DEGpf', (ctx) => {
    const DEGcolumns = ctx.resultPool
      .getData()
      .entries.map((o) => o.obj)
      .filter(isPColumn)
      .filter((col) => col.spec.name === 'pl7.app/rna-seq/DEG');

    return DEGcolumns;
  })

  .sections((ctx) => {
    return [
      { type: 'link', href: '/', label: 'UMAP' },
      { type: 'link', href: '/violin', label: 'Gene Expression' },
      // { type: 'link', href: '/heatmap', label: 'Expression Heatmap' },
      { type: 'link', href: '/annotations', label: 'Annotations' } as const,
      ...(ctx.args.annotationSpec.steps.length > 0
        ? [
          { type: 'link', href: '/annotations-stats', label: 'Annotations stats' } as const,
          { type: 'link', href: '/annotations-stats-by-sample', label: 'Annotations stats by Sample' } as const,
        ]
        : []),
    ];
  })

  .argsValid((ctx) => ctx.args.countsRef !== undefined && ctx.args.annotationSpec.steps.length > 0)

  // We enrich the input, only if we produce annotations
  .enriches((args) => args.countsRef !== undefined && args.annotationSpec.steps.length > 0 ? [args.countsRef] : [])

  .title((ctx) => ctx.args.title
    ? `Cell Browser - ${ctx.args.title}`
    : 'Cell Browser')

  .done(2);

export type Platforma = typeof platforma;
export type BlockOutputs = InferOutputsType<typeof platforma>;
export * from './types';
// export type Href = InferHrefType<typeof platforma>;
// export type { BlockArgs };

// @todo: reexport this function from SDK, after it will be published
export function isHiddenFromGraphColumn(column: PColumnSpec): boolean {
  return !!readAnnotationJson(column, Annotation.HideDataFromGraphs);
}
