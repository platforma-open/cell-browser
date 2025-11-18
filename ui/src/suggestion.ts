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

export type PValue = string | number | null;

type SuggestionResponse = {
  values: {
    value: string;
    label: string;
  }[];
  overflow: boolean;
};

const sortValues = (values: { value: string; label: string }[]) => values.sort((a, b) => a.label.localeCompare(b.label, 'en', { numeric: true }));
export async function getUniqueSourceValuesWithLabels(
  provider: ColumnsProvider,
  {
    columnId: selectedSource,
    axisIdx,
    limit,
    searchQuery,
    searchQueryValue,
  }: {
    columnId: PObjectId;
    axisIdx?: number;
    limit?: number;
    searchQuery?: string; // search by labels if axis labels exist
    searchQueryValue?: string; // search by value, not by label
  },
): Promise<SuggestionResponse> {
  const selectedSourceSpec = await provider.getColumnSpecById(selectedSource);

  if (selectedSourceSpec == null || selectedSourceSpec.kind !== 'PColumn') {
    return { values: [], overflow: false };
  }

  const discreteValuesStr = readAnnotation(selectedSourceSpec, Annotation.DiscreteValues);

  // if column's annotation contains discrete values - take them from it
  try {
    const discreteValues: string[] | null = discreteValuesStr
      ? (JSON.parse(discreteValuesStr) as (string | number)[]).map((v) => String(v))
      : null;
    if (discreteValues) {
      const values = discreteValues.map((v) => ({ value: v, label: v }));
      sortValues(values);
      return { values, overflow: false };
    }
  } catch {
    console.error(`Parsing error: discrete values annotation ${discreteValuesStr} in ${selectedSource}`);
  }

  if (axisIdx != null) {
    const axisSpec = selectedSourceSpec.axesSpec[axisIdx];
    const strAxisId = canonicalizeAxisId(getAxisId(axisSpec));
    const labelsColumnId = await getColumnOrAxisValueLabelsId(provider, strAxisId);// info.parentSources
    let filters: PTableRecordSingleValueFilterV2[] = [];
    if (labelsColumnId) {
      if (searchQuery) {
        filters = [{
          type: 'bySingleColumnV2',
          column: {
            type: 'column',
            id: labelsColumnId,
          },
          predicate: {
            operator: 'StringIContains',
            substring: searchQuery,
          },
        }];
      }
      if (searchQueryValue) {
        filters = [{
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
            substring: searchQueryValue,
          },
        }];
      }
      const { data: dataValues, axesData } = await provider.getSingleColumnData(labelsColumnId, filters);
      const axisKeys = axesData[strAxisId];
      const values: { value: string; label: string }[] = [];
      for (let i = 0; i < Math.min(axisKeys.length, limit ?? axisKeys.length); i++) {
        values.push({ value: String(axisKeys[i]), label: String(dataValues[i]) });
      }
      sortValues(values);
      return { values, overflow: !(limit === undefined || axisKeys.length < limit) };
    } else {
      const searchInLabelsOrValue = searchQuery ?? searchQueryValue;

      if (searchInLabelsOrValue) {
        filters = [{
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
            substring: searchInLabelsOrValue,
          },
        }];
      }
      const response = await provider.getAxisUniqueValues(provider, {
        axisId: getAxisId(axisSpec),
        parentColumnIds: [selectedSource],
        limit,
        filters,
      });
      const values = response.values.map((v) => ({ value: String(v), label: String(v) }));
      sortValues(values);
      return { values, overflow: response.overflow };
    }
  } else {
    const searchInLabelsOrValue = searchQuery ?? searchQueryValue;
    const filters: PTableRecordSingleValueFilterV2[] = searchInLabelsOrValue
      ? [
          {
            type: 'bySingleColumnV2',
            column: {
              type: 'column',
              id: selectedSource,
            },
            predicate: {
              operator: 'StringIContains',
              substring: searchInLabelsOrValue,
            },
          },
        ]
      : [];
    const response = await provider.getColumnUniqueValues(selectedSource, limit, filters);
    const values = response.values.map((v) => ({ value: String(v), label: String(v) }));
    sortValues(values);
    return { values, overflow: response.overflow };
  }
}

export type AxesSet = Map<ColumnOrAxisIdString, { parentSource: ColumnOrAxisIdString; spec: AxisSpec }>;

export type ColumnOrAxisIdString = string;

const LABEL_COLUMN_NAME = 'pl7.app/label';

export async function getColumnOrAxisValueLabelsId(
  provider: ColumnsProvider,
  strAxisId: CanonicalizedJson<AxisId>,
): Promise<PObjectId | undefined> {
  const labelColumns = await provider.getColumnsFull([], false, undefined, [LABEL_COLUMN_NAME]);
  const labelColumn = labelColumns.find(({ spec }) => {
    return spec && spec.axesSpec.length === 1 && canonicalizeAxisId(spec.axesSpec[0]) === strAxisId;
  });
  return labelColumn?.columnId;
}

const UNIQUE_VALUES_LIMIT = 1000000;

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

export class ColumnsProvider {
  pframeHandle: PFrameHandle;
  pframeDriver: PFrameDriver;

  constructor(pframeHandle: PFrameHandle, pframeDriver: PFrameDriver) {
    this.pframeHandle = pframeHandle;
    this.pframeDriver = pframeDriver;
  }

  async isColumnExisted(id: PObjectId) {
    const spec = await this.getColumnSpecById(id);
    return spec ? true : false;
  }

  async getSingleColumnData(id: PObjectId, filters: PTableRecordSingleValueFilterV2[] = []) {
    if (!(await this.isColumnExisted(id))) {
      return {
        axesData: {},
        data: [],
      };
    }
    try {
      const response: FullPTableColumnData[] = await this.pframeDriver.calculateTableData(this.pframeHandle, {
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

  async getColumnUniqueValues(
    id: PObjectId,
    limit = UNIQUE_VALUES_LIMIT,
    filters: PTableRecordSingleValueFilterV2[] = [],
  ) {
    if (!(await this.isColumnExisted(id))) {
      return { values: [], overflow: false };
    }
    const request: UniqueValuesRequest = {
      columnId: id,
      filters,
      limit,
    };
    try {
      const response = await this.pframeDriver.getUniqueValues(this.pframeHandle, request);
      let overflow = false;
      if (response.overflow) {
        overflow = true;
        console.warn(`More than ${limit} values for ${id} column`);
      }
      return {
        values: Array.from(response.values.data as ArrayLike<unknown>).map(String),
        overflow,
      };
    } catch (err) {
      console.error('PFrame: getUniqueValues for column error');
      throw err;
    }
  }

  async getAxisUniqueValues(
    provider: ColumnsProvider,
    {
      axisId,
      parentColumnIds,
      limit = UNIQUE_VALUES_LIMIT,
      filters = [],
    }: {
      axisId: AxisId;
      parentColumnIds: PObjectId[];
      limit?: number;
      filters?: PTableRecordSingleValueFilterV2[];
    },
  ) {
    const strAxisId = canonicalizeAxisId(axisId);
    const parentsSpecs = (await Promise.all(parentColumnIds.map((p) => provider.getColumnSpecById(p))))
      .flatMap((spec, i): [PObjectId, PColumnSpec][] => spec != null && spec.kind === 'PColumn' ? [[parentColumnIds[i], spec]] : [])
      .filter(([_, spec]) => spec.axesSpec.some((axisSpec) => canonicalizeAxisId(getAxisId(axisSpec)) === strAxisId));

    if (parentsSpecs.length === 0) {
      console.warn('Axis unique values requested without parent columns');
      return { values: [], overflow: false };
    }
    try {
      const responses = await Promise.all(
        parentsSpecs.map(([id]) =>
          this.pframeDriver.getUniqueValues(this.pframeHandle, {
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
          flatten(responses.map((r) => {
            return Array.from(r.values.data as ArrayLike<unknown>).map(String);
          })) as string[],
        ),
        overflow,
      };
    } catch (err) {
      console.error('PFrame: getUniqueValues for axis error', err);
      return { values: [], overflow: false };
    }
  }

  async getColumnSpecById(id: PObjectId): Promise<PColumnSpec | null> {
    try {
      const response = await this.pframeDriver.getColumnSpec(this.pframeHandle, id);
      return response ?? null;
    } catch (err) {
      console.error('PFrame: get single column error', err);
      return null;
    }
  }

  async getRequestColumnsFromSelectedSources(sources: PObjectId[]): Promise<AxisId[]> {
    const result: AxisId[] = [];
    // NB: we don't need to add axes in request because axes are already in columns
    for (const item of sources) {
      const spec = await this.getColumnSpecById(item);
      if (spec?.kind === 'PColumn') {
        result.push(...spec.axesSpec.map((spec) => getAxisId(spec)));
      }
    }
    return result;
  }

  async getColumnsFull(
    selectedSources: PObjectId[],
    strictlyCompatible: boolean,
    types?: ValueType[],
    names?: string[],
    annotations?: FindColumnsRequest['columnFilter']['annotationValue'],
    annotationsNotEmpty?: string[],
  ): Promise<PColumnIdAndSpec[]> {
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
        compatibleWith: await this.getRequestColumnsFromSelectedSources(selectedSources),
        strictlyCompatible, // should be true if we want to get meta and false if X/Y
      };
      const response: FindColumnsResponse = await this.pframeDriver.findColumns(this.pframeHandle, request);
      const result: PColumnIdAndSpec[] = [];
      response.hits.forEach((item) => {
        // ***
        // consider mapping variants in qualifications
        // ***

        result.push(item);
      });
      return result;
    } catch (err) {
      console.error('PFrame: findColumns error');
      throw err;
    }
  }
}
