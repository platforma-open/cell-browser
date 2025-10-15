import type { AnnotationSpec, AnnotationSpecUi } from '@platforma-open/milaboratories.wip-cell-browser.model';
import { canonicalizeJson, convertFilterSpecsToExpressionSpecs } from '@platforma-sdk/model';
import { watchDebounced } from '@vueuse/core';
import { toRaw } from 'vue';

export function processAnnotationUiStateToArgsState(
  getUiState: () => AnnotationSpecUi,
  getArgsState: () => AnnotationSpec,
) {
  watchDebounced(getUiState, () => {
    try {
      const uiState = getUiState();
      const argsState = getArgsState();

      argsState.title = uiState.title;
      argsState.steps = convertFilterSpecsToExpressionSpecs(convertAxisIdsToFilteredAxisIds(uiState.steps));
    } catch (err) {
      console.error('Error while compiling annotation UI state to Args:', err);
    }
  }, { deep: true, debounce: 1000 });
}

function convertAxisIdsToFilteredAxisIds(steps: AnnotationSpecUi['steps']): AnnotationSpecUi['steps'] {
  return structuredClone(toRaw(steps)).map((step) => {
    step.filter.filters = step.filter.filters.map((filter) => {
      if ('column' in filter) {
        const columnJson = JSON.parse(filter.column);
        const shouldMutate = columnJson.axes.length > 2;
        const newColumn = shouldMutate
          ? { source: columnJson, axisFilters: [[2, 'YKR082W']] }
          : columnJson;
        return { ...filter, column: canonicalizeJson(newColumn) } as unknown as typeof filter;
      }
      return;
    }) as unknown as typeof step.filter.filters;
    return step;
  });
}
