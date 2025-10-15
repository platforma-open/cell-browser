import type { AnnotationSpecUi } from '@platforma-open/milaboratories.wip-cell-browser.model';

export function getDefaultAnnotationScript(): AnnotationSpecUi {
  return {
    isCreated: false,
    title: 'Cell Annotation',
    steps: [],
  };
}
