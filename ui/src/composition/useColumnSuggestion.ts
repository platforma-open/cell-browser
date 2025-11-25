import type {
  ListOptionBase,
  SUniversalPColumnId,
} from '@milaboratories/pl-model-common';
import { getUniqueSourceValuesWithLabels } from '@platforma-sdk/model';

import { useApp } from '../app';

export function useColumnSuggestion() {
  const app = useApp();

  const suggest = async (params: { columnId: string; searchStr: string; axisIdx?: number }): Promise<ListOptionBase<string | number>[]> => {
    const handle = app.model.outputs.overlapColumnsPf;
    if (handle == null) return [];

    const response = await getUniqueSourceValuesWithLabels(handle, {
      columnId: params.columnId as SUniversalPColumnId,
      axisIdx: params.axisIdx,
      limit: 300,
      searchQuery: params.searchStr,
    }).catch((err) => {
      console.error('Error while fetching unique values for suggestion:', err);
      return ({ values: [] as ListOptionBase<string | number>[] });
    });

    return response.values;
  };

  return suggest;
}
