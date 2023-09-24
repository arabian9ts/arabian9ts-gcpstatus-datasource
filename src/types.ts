import { DataQuery, DataSourceJsonData } from '@grafana/data';

export interface StatusDataSourceOptions extends DataSourceJsonData {}

export interface StatusQuery extends DataQuery {
  service: string;
  location: string;
}

export const defaultQuery: Partial<StatusQuery> = {
  service: '',
  location: '',
}

export type Status = 'AVAILABLE' | 'SERVICE_INFORMATION' | 'SERVICE_DISRUPTION' | 'SERVICE_OUTAGE';
export type Level = 'info' | 'warn' | 'error' | 'critical';

export const statusToLevel = (status: Status): Level => {
  switch (status) {
    case 'AVAILABLE':
      return 'info';
    case 'SERVICE_INFORMATION':
      return 'warn';
    case 'SERVICE_DISRUPTION':
      return 'error';
    case 'SERVICE_OUTAGE':
      return 'critical';
    default:
      throw new Error(`Unexpected status: ${status}`);
  }
}
