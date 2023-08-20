import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { DataSourceHttpSettings } from '@grafana/ui';
import React from 'react';
import { StatusDataSourceOptions } from '../types';

interface Props extends DataSourcePluginOptionsEditorProps<StatusDataSourceOptions> {}

const defaultUrl = 'https://status.cloud.google.com/incidents.json';

export const ConfigEditor: React.FC<Props> = ({ onOptionsChange, options }) => {
  return (
    <DataSourceHttpSettings
      defaultUrl={defaultUrl}
      dataSourceConfig={options}
      onChange={onOptionsChange}
    />
  );
};
