import type {
  InferHrefType,
  InferOutputsType,
  PColumnEntryUniversal,
  PlDataTableStateV2,
  PlRef,
  SimplifiedUniversalPColumnEntry,
} from '@platforma-sdk/model';
import {
  BlockModel,
  createPlDataTableStateV2,
  createPlDataTableV2,
  PColumnCollection,
} from '@platforma-sdk/model';
import omit from 'lodash.omit';
import type { AnnotationSpec, AnnotationSpecUi } from './types';

type BlockArgs = {
  inputAnchor?: PlRef;
  datasetTitle?: string;
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
  })

  .output('inputOptions', (ctx) =>
    ctx.resultPool.getOptions([
      {
        axes: [
          { name: 'pl7.app/sampleId' },
          { name: 'pl7.app/sc/cellId' },
          { name: 'pl7.app/rna-seq/geneId' },
        ],
        // annotations: { 'pl7.app/isAnchor': 'true' },
      },
    ], {
      refsWithEnrichments: true,
    }),
  )

  .output('overlapColumns', (ctx) => {
    if (ctx.args.inputAnchor === undefined)
      return undefined;
    const anchorCtx = ctx.resultPool.resolveAnchorCtx({ main: ctx.args.inputAnchor });
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
    if (ctx.args.inputAnchor === undefined)
      return undefined;

    const anchorCtx = ctx.resultPool.resolveAnchorCtx({ main: ctx.args.inputAnchor });
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
    const annotationStatsBySamplePf = ctx.prerun?.resolve({ field: 'annotationStatsPf', assertFieldType: 'Input', allowPermanentAbsence: true });
    const allColumns = annotationStatsBySamplePf?.getPColumns();

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
  .output('statsBySampleTable', (ctx) => {
    const annotationStatsBySamplePf = ctx.prerun?.resolve({ field: 'annotationStatsBySamplePf', assertFieldType: 'Input', allowPermanentAbsence: true });
    const allColumns = annotationStatsBySamplePf?.getPColumns();

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

  .sections((ctx) => {
    return [
      { type: 'link', href: '/', label: 'Annotation' } as const,
      ...(ctx.args.annotationSpec.steps.length > 0
        ? [
          { type: 'link', href: '/stats', label: 'Stats' } as const,
          { type: 'link', href: '/stats-by-sample', label: 'Stats by Sample' } as const,
        ]
        : []),
    ];
  })

  .argsValid((ctx) => ctx.args.inputAnchor !== undefined && ctx.args.annotationSpec.steps.length > 0)

  // We enrich the input, only if we produce annotations
  .enriches((args) => args.inputAnchor !== undefined && args.annotationSpec.steps.length > 0 ? [args.inputAnchor] : [])

  .title((ctx) => ctx.args.annotationSpec.steps.length > 0
    ? `Annotation - ${ctx.args.annotationSpec.title}`
    : ctx.args.datasetTitle
      ? `Cell Browser - ${ctx.args.datasetTitle}`
      : 'Cell Browser')

  .done(2);

export type Platforma = typeof platforma;
export type BlockOutputs = InferOutputsType<typeof platforma>;
export type Href = InferHrefType<typeof platforma>;
export * from './types';
export type { BlockArgs };

