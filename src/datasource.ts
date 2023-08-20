import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  FieldType,
  MutableDataFrame,
} from '@grafana/data';
import { isFetchError } from '@grafana/runtime';
import _ from 'lodash';
import defaults from 'lodash/defaults';
import { StatusDataSourceOptions, StatusQuery, Status, statusToLevel, defaultQuery } from './types';

type Incident = {
  id: string;
  service_name: string;
  begin: string;
  modified: string;
  most_recent_update: Update;
  updates: Update[];
};

type Update = {
  status: Status;
  when: string;
  text: string;
  affected_locations: AffectedLocation[];
}

type AffectedLocation = {
  id: string;
  title: string;
}

export class DataSource extends DataSourceApi<StatusQuery, StatusDataSourceOptions> {
  url: string;

  constructor(instanceSettings: DataSourceInstanceSettings<StatusDataSourceOptions>) {
    super(instanceSettings);

    this.url = instanceSettings.url!;
  }

  async query(options: DataQueryRequest<StatusQuery>): Promise<DataQueryResponse> {
    const { range } = options;
    const from = new Date(range!.from.valueOf()).getTime();
    const to = new Date(range!.to.valueOf()).getTime();

    const promises = options.targets.map(async (target) => {
      const query = defaults(target, defaultQuery);
      const serviceQuery = new RegExp(query.service);
      const locationQuery = new RegExp(query.location);

      const apiRequest = (): Promise<Incident[]> => fetch(this.url).then((r) => r.json());
      const response = await apiRequest();

      const defaultFields = [
          { name: 'time', type: FieldType.time },
          { name: 'content', type: FieldType.string },
          { name: 'id', type: FieldType.string },
          { name: 'level', type: FieldType.string },
          { name: 'service', type: FieldType.string },
          { name: 'locations', type: FieldType.string },
          { name: 'text', type: FieldType.string },
      ]

      const incidentFrame = new MutableDataFrame({
        refId: target.refId,
        meta: { preferredVisualisationType: 'logs' },
        fields: defaultFields,
      });

      response.forEach((incident: Incident) => {
        const timestamp = new Date(incident.begin).getTime()
        if (timestamp < from || timestamp > to) {
          return
        }

        if (!serviceQuery.test(incident.service_name)) {
          return
        }
        if (!serviceQuery.test(incident.most_recent_update.text)) {
          return
        }
        for (const loc of incident.most_recent_update.affected_locations) {
          if (!locationQuery.test(loc.id)) {
            return
          }
        }

        incidentFrame.add({
          time: timestamp,
          content: `${incident.begin} [${incident.most_recent_update.status}] ${incident.service_name}`,
          level: statusToLevel(incident.most_recent_update.status),
          id: incident.id,
          service: incident.service_name,
          locations: incident.most_recent_update.affected_locations.map((location: AffectedLocation) => location.title).join(', '),
          text: incident.most_recent_update.text,
        });
      });

      return incidentFrame;
    });

    return Promise.all(promises).then((data) => ({ data }));
  }

  async testDatasource() {
    const defaultErrorMessage = 'Cannot connect to API';

    try {
      const response = await fetch(this.url);
      if (response.status === 200) {
        return {
          status: 'success',
          message: 'Success',
        };
      } else {
        return {
          status: 'error',
          message: response.statusText ? response.statusText : defaultErrorMessage,
        };
      }
    } catch (err) {
      let message = '';
      if (_.isString(err)) {
        message = err;
      } else if (isFetchError(err)) {
        message = 'Fetch error: ' + (err.statusText ? err.statusText : defaultErrorMessage);
        if (err.data && err.data.error && err.data.error.code) {
          message += ': ' + err.data.error.code + '. ' + err.data.error.message;
        }
      }
      return {
        status: 'error',
        message,
      };
    }
  }
}
