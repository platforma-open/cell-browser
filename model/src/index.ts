import type { GraphMakerState } from '@milaboratories/graph-maker';
import type {
  InferOutputsType,
  PFrameHandle,
  PlRef } from '@platforma-sdk/model';
import {
  BlockModel,
  createPFrameForGraphs,
  isPColumn,
  isPColumnSpec,
} from '@platforma-sdk/model';

export type UiState = {
  graphStateUMAP: GraphMakerState;
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
  })

  .output('countsOptions', (ctx) =>
    // I've added these "||" for backward compatibility (As I see, the shape of PColum was changed)
    ctx.resultPool.getOptions((spec) => isPColumnSpec(spec)
      && spec.name === 'pl7.app/rna-seq/countMatrix' && spec.domain?.['pl7.app/rna-seq/normalized'] === 'false'
    , { includeNativeLabel: true, addLabelAsSuffix: true }),
  )

  .output('UMAPPf', (ctx): PFrameHandle | undefined => {
    return createPFrameForGraphs(ctx,
      ctx.resultPool
        .getData()
        .entries.map((c) => c.obj)
        .filter(isPColumn),
      // .filter((column) => column.spec.name.includes('umap')),
    );
  })

  .sections((_ctx) => ([
    { type: 'link', href: '/', label: 'Main' },
    { type: 'link', href: '/umap', label: 'UMAP' },
  ]))

  .title((ctx) =>
    ctx.args.title
      ? `Cell Browser - ${ctx.args.title}`
      : 'Cell Browser',
  )

  .done();

export type BlockOutputs = InferOutputsType<typeof model>;
