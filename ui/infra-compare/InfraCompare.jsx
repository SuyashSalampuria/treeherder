import React from 'react';
import PropTypes from 'prop-types';
import difference from 'lodash/difference';

import withValidation from '../perfherder/Validation';

import { getCounterMap } from './helpers';
import { phTimeRanges } from './constants';
import InfraCompareTableView from './InfraCompareTableView';

class CompareView extends React.PureComponent {
  getInterval = (oldTimestamp, newTimestamp) => {
    const now = new Date().getTime() / 1000;
    let timeRange = Math.min(oldTimestamp, newTimestamp);
    timeRange = Math.round(now - timeRange);
    const newTimeRange = phTimeRanges.find((time) => timeRange <= time.value);
    return newTimeRange.value;
  };

  queryParams = (project, interval) => ({
    project,
    interval,
  });

  getQueryParams = (timeRange) => {
    const {
      originalProject,
      newProject,
      originalRevision,
      newRevision,
      newResultSet,
      originalResultSet,
    } = this.props.validated;

    let originalParams;
    let interval;
    if (originalRevision) {
      interval = this.getInterval(
        originalResultSet.push_timestamp,
        newResultSet.push_timestamp,
      );
      originalParams = this.queryParams(originalProject, interval);
      originalParams.revision = originalRevision;
    } else {
      interval = timeRange.value;
      const startDateMs = (newResultSet.push_timestamp - interval) * 1000;
      const endDateMs = newResultSet.push_timestamp * 1000;

      originalParams = this.queryParams(originalProject, interval);
      originalParams.startday = new Date(startDateMs)
        .toISOString()
        .slice(0, -5);
      originalParams.endday = new Date(endDateMs).toISOString().slice(0, -5);
    }

    const newParams = this.queryParams(newProject, interval);
    newParams.revision = newRevision;
    return [originalParams, newParams];
  };

  getDisplayResults = (origResultsMap, newResultsMap, tableNames) => {
    let compareResults = new Map();
    const testsWithNoise = [];
    tableNames.forEach((jobName) => {
      jobName = jobName.replace(/-\d+$/, '');
      const oldResults = origResultsMap.filter(
        (job) => job.job_name.replace(/-\d+$/, '') === jobName,
      );
      const newResults = newResultsMap.filter(
        (job) => job.job_name.replace(/-\d+$/, '') === jobName,
      );
      const cmap = getCounterMap(jobName, oldResults, newResults);
      if (cmap.isEmpty) {
        return;
      }
      console.log(cmap);
      compareResults.set(jobName, [cmap]);
    });
    console.log(compareResults)
    compareResults = new Map([...compareResults.entries()].sort());
    const updates = { compareResults, testsWithNoise, loading: false };
    this.props.updateAppState({ compareData: compareResults });

    const resultsArr = Array.from(compareResults.keys());
    const testsNoResults = difference(tableNames, resultsArr).sort().join(', ');

    if (testsNoResults.length) {
      updates.testsNoResults = testsNoResults;
    }

    return updates;
  };

  render() {
    return (
      <InfraCompareTableView
        {...this.props}
        getQueryParams={this.getQueryParams}
        getDisplayResults={this.getDisplayResults}
      />
    );
  }
}

CompareView.propTypes = {
  projects: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  validated: PropTypes.shape({
    originalResultSet: PropTypes.shape({}),
    newResultSet: PropTypes.shape({}),
    newRevision: PropTypes.string,
    originalProject: PropTypes.string,
    newProject: PropTypes.string,
    originalRevision: PropTypes.string,
    framework: PropTypes.string,
    updateParams: PropTypes.func.isRequired,
  }),
};

CompareView.defaultProps = {
  validated: PropTypes.shape({}),
};

const requiredParams = new Set([
  'originalProject',
  'newProject',
  'newRevision',
]);

export default withValidation({ requiredParams })(CompareView);
