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
      const apiRequest = (): Promise<Incident[]> => fetch(this.url).then((r) => r.json());
      const response = await apiRequest();

      const defaultFields = [
          { name: 'level', type: FieldType.string },
          { name: 'time', type: FieldType.time },
          { name: 'content', type: FieldType.string },
          { name: 'service', type: FieldType.string },
          { name: 'locations', type: FieldType.string },
          { name: 'text', type: FieldType.string },
          { name: 'id', type: FieldType.string },
      ]

      const incidentFrame = new MutableDataFrame({
        refId: target.refId,
        meta: { preferredVisualisationType: 'logs' },
        fields: defaultFields,
      });

      const query = defaults(target, defaultQuery);

      let serviceQuery: RegExp | null = null;
      if (query.service) {
        serviceQuery = new RegExp(query.service);
      }

      let locationQuery: RegExp | null = null;
      if (query.location) {
        locationQuery = new RegExp(query.location);
      }

      response.forEach((incident: Incident) => {
        const timestamp = new Date(incident.begin).getTime()
        if (timestamp < from || timestamp > to) {
          return;
        }

        if (serviceQuery && !serviceQuery.test(incident.most_recent_update.text)) {
          return;
        }

        if (locationQuery) {
          let hit = false;
          for (const loc of incident.most_recent_update.affected_locations) {
            if (locationQuery.test(loc.id)) {
              hit = true;
              break;
            }
          }
          if (!hit) {
            return;
          }
        }

        incidentFrame.add({
          level: statusToLevel(incident.most_recent_update.status),
          time: timestamp,
          content: `${incident.begin} [${incident.most_recent_update.status}] ${incident.service_name}`,
          service: incident.service_name,
          locations: incident.most_recent_update.affected_locations.map((location: AffectedLocation) => location.title).join(', '),
          text: incident.most_recent_update.text,
          id: incident.id,
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
