import { type RenderCtx, getAllRelatedColumns, type PColumnSpec, isHiddenFromGraphColumn, isHiddenFromUIColumn } from '@platforma-sdk/model';
import type { BlockArgs, BlockUiState } from './types';

export function getMainPlotsPColumns(ctx: RenderCtx<BlockArgs, BlockUiState>) {
  if (ctx.args.countsRef == undefined) return undefined;

  const isSuitableSpec = (spec: PColumnSpec) => !isHiddenFromUIColumn(spec) && !isHiddenFromGraphColumn(spec);
  const allColumns = getAllRelatedColumns(ctx, isSuitableSpec);

  const annotationsColumns = ctx.args.annotationSpec.steps.length > 0
    ? (ctx.prerun?.resolve({
      field: 'annotationsPf',
      stableIfNotFound: true,
      assertFieldType: 'Input',
      allowPermanentAbsence: true,
    })?.getPColumns() ?? [])
    : [];

  return [...allColumns, ...annotationsColumns];
}
