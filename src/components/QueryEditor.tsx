import React, { ChangeEvent, PureComponent } from 'react';
import defaults from 'lodash/defaults';
import { HorizontalGroup, Input, Label } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from '../datasource';
import { StatusDataSourceOptions, StatusQuery, defaultQuery } from '../types';


type Props = QueryEditorProps<DataSource, StatusQuery, StatusDataSourceOptions>;

export class QueryEditor extends PureComponent<Props> {
  onServiceChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onChange, query, onRunQuery } = this.props;
    onChange({ ...query, service: event.target.value });
    onRunQuery();
  };

  onLocationChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onChange, query, onRunQuery } = this.props;
    onChange({ ...query, location: event.target.value });
    onRunQuery();
  };

  render() {
    const query = defaults(this.props.query, defaultQuery);
    const { service, location } = query;

    return (
      <HorizontalGroup>
        <Label>Service</Label>
        <Input
          type="string"
          label="Service"
          value={service}
          onChange={this.onServiceChange}
        />
        <Label>Location</Label>
        <Input
          type="string"
          label="Location"
          value={location}
          onChange={this.onLocationChange}
        />
      </HorizontalGroup>
    );
  }
}
