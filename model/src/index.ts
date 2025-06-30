import type { GraphMakerState } from '@milaboratories/graph-maker';
import {
  InferOutputsType,
  PFrameHandle,
  PlRef,
  PColumnIdAndSpec } from '@platforma-sdk/model';
import {
  BlockModel,
  createPFrameForGraphs,
  isPColumn,
  isPColumnSpec,
} from '@platforma-sdk/model';

export type UiState = {
  graphStateUMAP: GraphMakerState;
  graphStateViolin: GraphMakerState;
  heatmapState: GraphMakerState;
  countsRef?: PlRef;

};

export type BlockArgs = {
  countsRef?: PlRef;
  title?: string;
};

export const model = BlockModel.create()

  .withArgs<BlockArgs>({
  })

  .withUiState<UiState>({
    graphStateUMAP: {
      title: 'UMAP',
      template: 'dots',
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

  .output('countsOptions', (ctx) =>
    // I've added these "||" for backward compatibility (As I see, the shape of PColum was changed)
    ctx.resultPool.getOptions((spec) => isPColumnSpec(spec)
      && spec.name === 'pl7.app/rna-seq/countMatrix' && spec.domain?.['pl7.app/rna-seq/normalized'] === 'false'
    , { includeNativeLabel: true, addLabelAsSuffix: true }),
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
    return createPFrameForGraphs(ctx,
      ctx.resultPool
        .getData()
        .entries.map((c) => c.obj)
        .filter(isPColumn),
      // .filter((column) => column.spec.name.includes('umap')),
    );
  })

// @TODO - Currently createPFrameForGraphs is letting everything through. createPFrame used for now
  .output('ExprPf', (ctx): PFrameHandle | undefined => {
    let pCols = ctx.resultPool
      .getData()
      .entries.map((c) => c.obj)
      .filter(isPColumn)
      .filter((col) => col.spec.name === 'pl7.app/rna-seq/countMatrix');
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
      .filter((col) => col.spec.name === 'pl7.app/rna-seq/countMatrix' && col.spec.domain?.['pl7.app/rna-seq/normalized'] === 'true');
    if (pCols === undefined) return undefined;

    // Add sample labels and gene symbols
    const upstream = ctx.resultPool
      .getData()
      .entries.map((v) => v.obj)
      .filter(isPColumn)
      .filter((col) => col.spec.name === 'pl7.app/label'
      // Now geneSymbols have pl7.app/label, unnecessary
      // || col.spec.name === 'pl7.app/rna-seq/geneSymbols'
        || col.spec.name === 'pl7.app/rna-seq/DEG');

    pCols = [...pCols, ...upstream];

    return pCols.map(
      (c) =>
        ({
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

  .sections((_ctx) => ([
    { type: 'link', href: '/', label: 'Main' },
    { type: 'link', href: '/umap', label: 'UMAP' },
    { type: 'link', href: '/violin', label: 'Gene Expression' },
    { type: 'link', href: '/heatmap', label: 'Expression Heatmap' },
  ]))

  .title((ctx) =>
    ctx.args.title
      ? `Cell Browser - ${ctx.args.title}`
      : 'Cell Browser',
  )

  .done();

export type BlockOutputs = InferOutputsType<typeof model>;
