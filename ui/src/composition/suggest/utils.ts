import type {
  CalculateTableDataRequest,
  PColumnSpec,
  PFrameDriver,
  PFrameHandle,
  PTableVector,
  UniqueValuesRequest,
} from '@milaboratories/pl-model-common';
import { pTableValue } from '@milaboratories/pl-model-common';
import { flatten, uniq } from 'es-toolkit';

import type {
  AxisSpec,
} from '@milaboratories/pl-model-common';
import type { AxisId, CanonicalizedJson, FindColumnsRequest, FindColumnsResponse, FullPTableColumnData, PColumnIdAndSpec, PObjectId, PTableRecordSingleValueFilterV2, ValueType } from '@platforma-sdk/model';
import { Annotation, canonicalizeAxisId, getAxisId, readAnnotation } from '@platforma-sdk/model';

// Types
export type PValue = string | number | null;

export type PFrameContext = {
  handle: PFrameHandle;
  driver: PFrameDriver;
};

export type SuggestionResponse = {
  values: {
    value: string;
    label: string;
  }[];
  overflow: boolean;
};

export type SingleColumnData = {
  axesData: Record<string, PValue[]>;
  data: PValue[];
};

export type UniqueValuesResponse = {
  values: string[];
  overflow: boolean;
};

export type GetUniqueSourceValuesParams = {
  columnId: PObjectId;
  axisIdx?: number;
  limit?: number;
  searchQuery?: string;
  searchQueryValue?: string;
};

export type GetAxisUniqueValuesParams = {
  axisId: AxisId;
  parentColumnIds: PObjectId[];
  limit?: number;
  filters?: PTableRecordSingleValueFilterV2[];
};

export type GetColumnsFullParams = {
  selectedSources: PObjectId[];
  strictlyCompatible: boolean;
  types?: ValueType[];
  names?: string[];
  annotations?: FindColumnsRequest['columnFilter']['annotationValue'];
  annotationsNotEmpty?: string[];
};

// Constants
const LABEL_COLUMN_NAME = 'pl7.app/label';
const UNIQUE_VALUES_LIMIT = 1000000;

// Helper functions
const sortValuesPredicate = (a: { label: string }, b: { label: string }) =>
  a.label.localeCompare(b.label, 'en', { numeric: true });

function convertColumnData(type: ValueType, response: PTableVector, absentValue: number | null = null): PValue[] {
  if (type === 'String') {
    return response.data as PValue[];
  }
  const res: PValue[] = new Array(response.data.length);
  for (let i = 0; i < response.data.length; i++) {
    res[i] = pTableValue(response, i, { absent: absentValue, na: null }) as PValue;
  }
  return res;
}

function createSearchFilter(
  columnId: PObjectId,
  substring: string,
): PTableRecordSingleValueFilterV2 {
  return {
    type: 'bySingleColumnV2',
    column: {
      type: 'column',
      id: columnId,
    },
    predicate: {
      operator: 'StringIContains',
      substring,
    },
  };
}

function createAxisSearchFilter(
  axisSpec: AxisSpec,
  substring: string,
): PTableRecordSingleValueFilterV2 {
  return {
    type: 'bySingleColumnV2',
    column: {
      type: 'axis',
      id: {
        type: axisSpec.type,
        name: axisSpec.name,
      },
    },
    predicate: {
      operator: 'StringIContains',
      substring,
    },
  };
}

function mapValuesToSuggestions(values: string[]): { value: string; label: string }[] {
  return values.map((v) => ({ value: String(v), label: String(v) })).sort(sortValuesPredicate);
}

// Core functions
export async function isColumnExisted(ctx: PFrameContext, id: PObjectId): Promise<boolean> {
  const spec = await getColumnSpecById(ctx, id);
  return spec !== null;
}

export async function getColumnSpecById(ctx: PFrameContext, id: PObjectId): Promise<PColumnSpec | null> {
  try {
    const response = await ctx.driver.getColumnSpec(ctx.handle, id);
    return response ?? null;
  } catch (err) {
    console.error('PFrame: get single column error', err);
    return null;
  }
}

export async function getSingleColumnData(
  ctx: PFrameContext,
  id: PObjectId,
  filters: PTableRecordSingleValueFilterV2[] = [],
): Promise<SingleColumnData> {
  if (!(await isColumnExisted(ctx, id))) {
    return {
      axesData: {},
      data: [],
    };
  }

  try {
    const response: FullPTableColumnData[] = await ctx.driver.calculateTableData(ctx.handle, {
      src: {
        type: 'column',
        column: id,
      },
      filters,
      sorting: [],
    } as CalculateTableDataRequest<PObjectId>);

    const axes = response.filter((item) => item.spec.type === 'axis');
    const columns = response.filter((item) => item.spec.type === 'column');

    return {
      axesData: axes.reduce((res: Record<string, PValue[]>, item) => {
        const id = getAxisId(item.spec.spec as AxisSpec);
        res[canonicalizeAxisId(id)] = convertColumnData(id.type, item.data);
        return res;
      }, {}),
      data: columns.length ? convertColumnData(columns[0].data.type, columns[0].data) : [],
    };
  } catch (err) {
    console.error('PFrame: calculateTableData error');
    throw err;
  }
}

export async function getColumnUniqueValues(
  ctx: PFrameContext,
  id: PObjectId,
  limit = UNIQUE_VALUES_LIMIT,
  filters: PTableRecordSingleValueFilterV2[] = [],
): Promise<UniqueValuesResponse> {
  if (!(await isColumnExisted(ctx, id))) {
    return { values: [], overflow: false };
  }

  const request: UniqueValuesRequest = {
    columnId: id,
    filters,
    limit,
  };

  try {
    const response = await ctx.driver.getUniqueValues(ctx.handle, request);
    if (response.overflow) {
      console.warn(`More than ${limit} values for ${id} column`);
    }
    return {
      values: Array.from(response.values.data as ArrayLike<unknown>).map(String),
      overflow: response.overflow,
    };
  } catch (err) {
    console.error('PFrame: getUniqueValues for column error');
    throw err;
  }
}

export async function getAxisUniqueValues(
  ctx: PFrameContext,
  params: GetAxisUniqueValuesParams,
): Promise<UniqueValuesResponse> {
  const { axisId, parentColumnIds, limit = UNIQUE_VALUES_LIMIT, filters = [] } = params;
  const strAxisId = canonicalizeAxisId(axisId);

  const parentsSpecs = (await Promise.all(parentColumnIds.map((p) => getColumnSpecById(ctx, p))))
    .flatMap((spec, i): [PObjectId, PColumnSpec][] =>
      spec != null && spec.kind === 'PColumn' ? [[parentColumnIds[i], spec]] : [],
    )
    .filter(([_, spec]) =>
      spec.axesSpec.some((axisSpec) => canonicalizeAxisId(getAxisId(axisSpec)) === strAxisId),
    );

  if (parentsSpecs.length === 0) {
    console.warn('Axis unique values requested without parent columns');
    return { values: [], overflow: false };
  }

  try {
    const responses = await Promise.all(
      parentsSpecs.map(([id]) =>
        ctx.driver.getUniqueValues(ctx.handle, {
          columnId: id,
          axis: axisId,
          filters,
          limit,
        }),
      ),
    );

    const overflow = responses.some((r) => r.overflow);
    return {
      values: uniq(
        flatten(responses.map((r) =>
          Array.from(r.values.data as ArrayLike<unknown>).map(String),
        )) as string[],
      ),
      overflow,
    };
  } catch (err) {
    console.error('PFrame: getUniqueValues for axis error', err);
    return { values: [], overflow: false };
  }
}

export async function getRequestColumnsFromSelectedSources(
  ctx: PFrameContext,
  sources: PObjectId[],
): Promise<AxisId[]> {
  const result: AxisId[] = [];
  for (const item of sources) {
    const spec = await getColumnSpecById(ctx, item);
    if (spec?.kind === 'PColumn') {
      result.push(...spec.axesSpec.map((spec) => getAxisId(spec)));
    }
  }
  return result;
}

export async function getColumnsFull(
  ctx: PFrameContext,
  params: GetColumnsFullParams,
): Promise<PColumnIdAndSpec[]> {
  const { selectedSources, strictlyCompatible, types, names, annotations, annotationsNotEmpty } = params;

  try {
    const request: FindColumnsRequest = {
      columnFilter: {
        type: types,
        name: names,
        annotationValue: annotations,
        annotationPattern: annotationsNotEmpty?.reduce((res, v) => {
          res[v] = '.+';
          return res;
        }, {} as Record<string, string>),
      },
      compatibleWith: await getRequestColumnsFromSelectedSources(ctx, selectedSources),
      strictlyCompatible,
    };

    const response: FindColumnsResponse = await ctx.driver.findColumns(ctx.handle, request);
    return response.hits;
  } catch (err) {
    console.error('PFrame: findColumns error');
    throw err;
  }
}

export async function getColumnOrAxisValueLabelsId(
  ctx: PFrameContext,
  strAxisId: CanonicalizedJson<AxisId>,
): Promise<PObjectId | undefined> {
  const labelColumns = await getColumnsFull(ctx, {
    selectedSources: [],
    strictlyCompatible: false,
    names: [LABEL_COLUMN_NAME],
  });

  const labelColumn = labelColumns.find(({ spec }) => {
    return spec && spec.axesSpec.length === 1 && canonicalizeAxisId(spec.axesSpec[0]) === strAxisId;
  });

  return labelColumn?.columnId;
}

async function getDiscreteValuesFromAnnotation(columnSpec: PColumnSpec): Promise<SuggestionResponse | null> {
  const discreteValuesStr = readAnnotation(columnSpec, Annotation.DiscreteValues);
  if (!discreteValuesStr) {
    return null;
  }

  try {
    const discreteValues: string[] = (JSON.parse(discreteValuesStr) as (string | number)[]).map((v) => String(v));
    const values = discreteValues.map((v) => ({ value: v, label: v })).sort(sortValuesPredicate);
    return { values, overflow: false };
  } catch {
    console.error(`Parsing error: discrete values annotation ${discreteValuesStr}`);
    return null;
  }
}

async function getAxisValuesWithLabels(
  ctx: PFrameContext,
  params: {
    columnId: PObjectId;
    axisSpec: AxisSpec;
    labelsColumnId: PObjectId | undefined;
    limit?: number;
    searchQuery?: string;
    searchQueryValue?: string;
  },
): Promise<SuggestionResponse> {
  const { columnId, axisSpec, labelsColumnId, limit, searchQuery, searchQueryValue } = params;
  const strAxisId = canonicalizeAxisId(getAxisId(axisSpec));

  let filters: PTableRecordSingleValueFilterV2[] = [];

  if (labelsColumnId) {
    if (searchQuery) {
      filters = [createSearchFilter(labelsColumnId, searchQuery)];
    }
    if (searchQueryValue) {
      filters = [createAxisSearchFilter(axisSpec, searchQueryValue)];
    }

    const { data: dataValues, axesData } = await getSingleColumnData(ctx, labelsColumnId, filters);
    const axisKeys = axesData[strAxisId];
    const values: { value: string; label: string }[] = [];

    for (let i = 0; i < Math.min(axisKeys.length, limit ?? axisKeys.length); i++) {
      values.push({ value: String(axisKeys[i]), label: String(dataValues[i]) });
    }

    values.sort(sortValuesPredicate);
    return { values, overflow: !(limit === undefined || axisKeys.length < limit) };
  } else {
    const searchInLabelsOrValue = searchQuery ?? searchQueryValue;
    if (searchInLabelsOrValue) {
      filters = [createAxisSearchFilter(axisSpec, searchInLabelsOrValue)];
    }

    const response = await getAxisUniqueValues(ctx, {
      axisId: getAxisId(axisSpec),
      parentColumnIds: [columnId],
      limit,
      filters,
    });

    const values = mapValuesToSuggestions(response.values);
    return { values, overflow: response.overflow };
  }
}

async function getColumnValuesWithLabels(
  ctx: PFrameContext,
  params: {
    columnId: PObjectId;
    limit?: number;
    searchQuery?: string;
    searchQueryValue?: string;
  },
): Promise<SuggestionResponse> {
  const { columnId, limit, searchQuery, searchQueryValue } = params;
  const searchInLabelsOrValue = searchQuery ?? searchQueryValue;

  const filters: PTableRecordSingleValueFilterV2[] = searchInLabelsOrValue
    ? [createSearchFilter(columnId, searchInLabelsOrValue)]
    : [];

  const response = await getColumnUniqueValues(ctx, columnId, limit, filters);
  const values = mapValuesToSuggestions(response.values);
  return { values, overflow: response.overflow };
}

export async function getUniqueSourceValuesWithLabels(
  ctx: PFrameContext,
  params: GetUniqueSourceValuesParams,
): Promise<SuggestionResponse> {
  const { columnId, axisIdx, limit, searchQuery, searchQueryValue } = params;

  const selectedSourceSpec = await getColumnSpecById(ctx, columnId);
  if (selectedSourceSpec == null || selectedSourceSpec.kind !== 'PColumn') {
    return { values: [], overflow: false };
  }

  // Try to get discrete values from annotation
  const discreteValues = await getDiscreteValuesFromAnnotation(selectedSourceSpec);
  if (discreteValues) {
    return discreteValues;
  }

  // Handle axis values
  if (axisIdx != null) {
    const axisSpec = selectedSourceSpec.axesSpec[axisIdx];
    const strAxisId = canonicalizeAxisId(getAxisId(axisSpec));
    const labelsColumnId = await getColumnOrAxisValueLabelsId(ctx, strAxisId);

    return getAxisValuesWithLabels(ctx, {
      columnId,
      axisSpec,
      labelsColumnId,
      limit,
      searchQuery,
      searchQueryValue,
    });
  }

  // Handle column values
  return getColumnValuesWithLabels(ctx, {
    columnId,
    limit,
    searchQuery,
    searchQueryValue,
  });
}
