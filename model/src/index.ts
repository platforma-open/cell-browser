// import type { GraphMakerState } from '@milaboratories/graph-maker';
import type {
  AnchoredIdDeriver,
  AxesVault,
  InferOutputsType, PColumn, PColumnDataUniversal, PColumnEntryUniversal,
  PColumnIdAndSpec,
  PColumnLazy,
  PColumnSpec,
  PFrameDef,
  PFrameHandle,
  PlDataTableStateV2,
  PlRef,
  RenderCtx,
} from '@platforma-sdk/model';
import {
  Annotation,
  BlockModel, canonicalizeJson, createPlDataTableSheet,
  createPlDataTableStateV2,
  createPlDataTableV2,
  enrichCompatible,
  getAxisId,
  getNormalizedAxesList,
  getUniquePartitionKeys,
  isHiddenFromGraphColumn,
  isHiddenFromUIColumn,
  isPColumn,
  isPColumnSpec,
  PColumnCollection,
  PColumnName,
} from '@platforma-sdk/model';
import type { GraphMakerState } from '@milaboratories/graph-maker';
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

const ALL_NEIGHBORS = [
  {
    axes: [
      { anchor: 'main', idx: 0 }, // sampleId
    ],
  },
  {
    axes: [
      { anchor: 'main', idx: 1 }, // cellId
    ],
  },
  {
    axes: [
      { anchor: 'main', idx: 2 }, // geneId
    ],
  },
  {
    axes: [
      { anchor: 'main', idx: 0 }, // sampleId
      { anchor: 'main', idx: 1 }, // cellId
    ],
  },
  {
    axes: [
      { anchor: 'main', idx: 0 }, // sampleId
      { anchor: 'main', idx: 2 }, // geneId
    ],
  },
  {
    axes: [
      { anchor: 'main', idx: 1 }, // cellId
      { anchor: 'main', idx: 2 }, // geneId
    ],
  },
  {
    axes: [
      { anchor: 'main', idx: 0 }, // sampleId
      { anchor: 'main', idx: 1 }, // cellId
      { anchor: 'main', idx: 2 }, // geneId
    ],
  },
];

function splitColumns(entries: PColumnEntryUniversal[]) {
  const labelColumns: PColumnEntryUniversal[] = [];
  const restColumns: PColumnEntryUniversal[] = [];

  for (const entry of entries) {
    if (entry.spec.name === PColumnName.Label) {
      labelColumns.push(entry);
    } else {
      restColumns.push(entry);
    }
  }

  return [labelColumns, restColumns];
}

function prepareToAdvancedFilters(
  entries: PColumnEntryUniversal[],
  anchorAxesSpec: PColumnSpec['axesSpec'],
) {
  const [labelColumns, columns] = splitColumns(entries);
  const ret = columns.map((entry) => {
    const axesSpec = entry.spec.axesSpec;
    return {
      id: entry.id,
      spec: entry.spec,
      label: entry.label,
      axesToBeFixed: axesSpec.length > anchorAxesSpec.length
        ? axesSpec.slice(anchorAxesSpec.length).map((axis, i) => {
          const labelColumn = labelColumns.find((c) => {
            return c.spec.axesSpec[0].name === axis.name;
          });

          return {
            idx: anchorAxesSpec.length + i,
            label: labelColumn?.label ?? axis.annotations?.[Annotation.Label] ?? axis.name,
          };
        })
        : undefined,
    };
  });

  ret.sort((a, b) => a.label.localeCompare(b.label));

  return ret;
};
export const platforma = BlockModel.create('Heavy')

  .withArgs<BlockArgs>({
    annotationSpec: {
      title: '',
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
  })

  .output('anchorAxesSpecs', (ctx) => {
    if (!ctx.args.countsRef) return undefined;
    return ctx.resultPool.getPColumnSpecByRef(ctx.args.countsRef)?.axesSpec;
  })

  .output('annotationsAxesSpecs', (ctx) => {
    if (!ctx.args.countsRef) return undefined;
    return ctx.resultPool.getPColumnSpecByRef(ctx.args.countsRef)?.axesSpec?.slice(0, 2);
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
    const anchorSpec = ctx.resultPool.getPColumnSpecByRef(ctx.args.countsRef);
    if (anchorCtx == null || anchorSpec == null) return undefined;

    const entries = new PColumnCollection()
      .addColumnProvider(ctx.resultPool)
      .addAxisLabelProvider(ctx.resultPool)
      .getUniversalEntries(
        ALL_NEIGHBORS,
        { anchorCtx },
      );

    if (entries === undefined) return undefined;

    return {
      pFrame: ctx.createPFrame(entries),
      filterOptions: prepareToAdvancedFilters(entries, anchorSpec.axesSpec.slice(0, 2)),
    };
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
      ALL_NEIGHBORS,
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
    const annotationStatsPf = ctx.prerun?.resolve({
      field: 'annotationStatsPf',
      assertFieldType: 'Input',
      allowPermanentAbsence: true,
    });
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

  .output('annotationsIsComputing', (ctx) => {
    if (ctx.args.countsRef === undefined) return false;
    if (ctx.args.annotationSpec.steps.length === 0) return false;

    const annotationsPf = ctx.prerun?.resolve('annotationsPf');

    return (annotationsPf === undefined);
  })

  .retentiveOutput('UMAPPf', (ctx): PFrameHandle | undefined => {
    if (ctx.args.countsRef == undefined) return undefined;

    const anchorCtx = ctx.resultPool.resolveAnchorCtx({ main: ctx.args.countsRef });
    if (!anchorCtx) return undefined;

    const baseColumns = getAllRelatedColumns(
      ctx,
      anchorCtx,
      (spec: PColumnSpec) => !isHiddenFromUIColumn(spec) && !isHiddenFromGraphColumn(spec),
    );

    const annotationsColumn = ctx.args.annotationSpec.steps.length > 0
      ? ctx.prerun?.resolve({
        field: 'annotationsPf',
        stableIfNotFound: true,
        assertFieldType: 'Input',
        allowPermanentAbsence: true,
      })?.getPColumns()
      : undefined;

    return ctx.createPFrame(annotationsColumn ? [...baseColumns, ...annotationsColumn] : baseColumns);
  })

  .output('umapDefaults', (ctx) => {
    if (ctx.args.countsRef == undefined) return undefined;

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
      ...(ctx.args.annotationSpec.steps.length > 0
        ? [
          { type: 'link', href: '/annotations', label: 'Annotations' } as const,
          { type: 'link', href: '/annotations-stats', label: 'Annotations stats' } as const,
          { type: 'link', href: '/annotations-stats-by-sample', label: 'Annotations stats by Sample' } as const,
        ]
        : []),
    ];
  })

  .argsValid((ctx) => ctx.args.countsRef !== undefined && ctx.args.annotationSpec.steps.length > 0)

  // We enrich the input, only if we produce annotations
  .enriches((args) => args.countsRef !== undefined && args.annotationSpec.steps.length > 0 ? [args.countsRef] : [])

  .title((ctx) => {
    const prefix = ctx.args.annotationSpec.steps.length > 0
      ? 'Cell Annotation'
      : 'Cell Browser';

    return ctx.args.title
      ? `${prefix} - ${ctx.args.title}`
      : prefix;
  })

  .done(2);

export type * from './types';
export type Platforma = typeof platforma;
export type BlockOutputs = InferOutputsType<typeof platforma>;

function getAllRelatedColumns<A, U>(
  ctx: RenderCtx<A, U>, anchorCtx: AnchoredIdDeriver, predicate: (spec: PColumnSpec) => boolean,
): PFrameDef<PColumn<PColumnDataUniversal> | PColumnLazy<undefined | PColumnDataUniversal>> {
  // if current block doesn't produce own columns then use all columns from result pool
  const columns = new PColumnCollection();
  columns.addColumnProvider(ctx.resultPool);
  const allColumns = columns.getUniversalEntries(predicate, { dontWaitAllData: true, overrideLabelAnnotation: false, enrichByLinkers: true, anchorCtx }) ?? [];

  const allAxes: AxesVault = new Map(allColumns
    .flatMap((column) => getNormalizedAxesList(column.spec.axesSpec))
    .map((axisSpec) => {
      const axisId = getAxisId(axisSpec);
      return [canonicalizeJson(axisId), axisSpec];
    }));

  // additional columns are duplicates with extra fields in domains for compatibility if there are ones with partial match
  const extendedColumns = enrichCompatible(allAxes, allColumns);

  return extendedColumns;
}
