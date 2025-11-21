import type {
  ListOptionBase,
  SUniversalPColumnId,
} from '@milaboratories/pl-model-common';

import { useApp } from '../../app';
import { getUniqueSourceValuesWithLabels } from './utils';

export function useColumnSuggestion() {
  const app = useApp();

  const suggest = async (params: { columnId: string; searchStr: string; axisIdx?: number }): Promise<ListOptionBase<string | number>[]> => {
    const provider = app.model.outputs.overlapColumnsPf;
    if (provider == null) return [];

    const response = await getUniqueSourceValuesWithLabels({
      handle: provider,
      driver: app.pFrameDriver,
    }, {
      columnId: params.columnId as SUniversalPColumnId,
      axisIdx: params.axisIdx,
      limit: 300,
      searchQuery: params.searchStr,
    });

    return response.values;
  };

  return suggest;
}
