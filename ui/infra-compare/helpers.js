import numeral from 'numeral';
import sortBy from 'lodash/sortBy';
import queryString from 'query-string';

import { getApiUrl } from '../helpers/url';
import { update, processResponse } from '../helpers/http';
import PerfSeriesModel, {
  getSeriesName,
  getTestName,
} from '../models/perfSeries';
import RepositoryModel from '../models/repository';
import JobModel from '../models/job';

import {
  endpoints,
  tValueCareMin,
  tValueConfidence,
  noiseMetricTitle,
  alertStatusMap,
} from './constants';

export const formatNumber = (input) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(input);

export const displayNumber = (input) =>
  Number.isNaN(input) ? 'N/A' : Number(input).toFixed(2);

export const calcPercentOf = function calcPercentOf(a, b) {
  return b ? (100 * a) / b : 0;
};

export const calcAverage = function calcAverage(values) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((a, b) => a + b, 0) / values.length;
};

export const getStdDev = function getStandardDeviation(values, avg) {
  if (values.length < 2) {
    return undefined;
  }

  if (!avg) avg = calcAverage(values);

  return Math.sqrt(
    values.map((v) => (v - avg) ** 2).reduce((a, b) => a + b) /
      (values.length - 1),
  );
};

// If a set has only one value, assume average-ish-plus standard deviation, which
// will manifest as smaller t-value the less items there are at the group
// (so quite small for 1 value). This default value is a parameter.
// C/T mean control/test group (in our case original/new data).
export const getTTest = function getTTest(
  valuesC,
  valuesT,
  stddevDefaultFactor,
) {
  const lenC = valuesC.length;
  const lenT = valuesT.length;

  if (!lenC || !lenT) {
    return 0;
  }

  const avgC = calcAverage(valuesC);
  const avgT = calcAverage(valuesT);
  let stddevC =
    lenC > 1 ? getStdDev(valuesC, avgC) : stddevDefaultFactor * avgC;
  let stddevT =
    lenT > 1 ? getStdDev(valuesT, avgT) : stddevDefaultFactor * avgT;

  if (lenC === 1) {
    stddevC = (valuesC[0] * stddevT) / avgT;
  } else if (lenT === 1) {
    stddevT = (valuesT[0] * stddevC) / avgC;
  }

  const delta = avgT - avgC;
  const stdDiffErr = Math.sqrt(
    (stddevC * stddevC) / lenC + // control-variance / control-size
      (stddevT * stddevT) / lenT,
  );

  return delta / stdDiffErr;
};

const analyzeSet = (jobs) => {
  let totalDurationAvg = 0;
  let failures = 0;
  let failureTotalRuntime = 0;
  jobs.forEach((job) => {
    totalDurationAvg += job.duration / jobs.length;
    if (job.result === 'testfailed') {
      failures++;
      failureTotalRuntime += job.duration;
    }
  });
  const failureAvgRunTime = failureTotalRuntime / failures;
  return {
    totalDurationAvg,
    failures,
    failureAvgRunTime,
  };
};

// Aggregates two sets of values into a "comparison object" which is later used
// to display a single line of comparison.
// The result object has the following properties:
// - .isEmpty: true if no data for either side.
// If !isEmpty, for originalData/newData (if the data exists)
// - .[original|new]Value      // Average of the values
// - .[original|new]Stddev     // stddev
// - .[original|new]StddevPct  // stddev as percentage of the average
// - .[original|new]Runs       // Display data: number of runs and their values
// If both originalData/newData exist, comparison data:
// - .newIsBetter              // is new result better or worse (even if unsure)
// - .isImprovement            // is new result better + we're confident about it
// - .isRegression             // is new result worse + we're confident about it
// - .delta
// - .deltaPercentage
// - .confidence               // t-test value
// - .confidenceText           // 'low'/'med'/'high'
// - .confidenceTextLong       // more explanation on what confidenceText means
// - .isMeaningful             // for highlighting - bool over t-test threshold
// And some data to help formatting of the comparison:
// - .className
// - .magnitude
// - .marginDirection

export const getCounterMap = function getCounterMap(
  jobName,
  originalData,
  newData,
) {
  const cmap = { isEmpty: false, jobName };

  if (!originalData && !newData) {
    cmap.isEmpty = true;
    return cmap;
  }

  if (originalData) {
    const orig = analyzeSet(originalData);
    cmap.originalValue = orig.totalDurationAvg;
    cmap.originalFailures = orig.failures;
    cmap.originalFailureAvgRunTime = orig.failureAvgRunTime;
  }

  if (newData) {
    const newd = analyzeSet(newData);
    cmap.newValue = newd.totalDurationAvg;
    cmap.newFailures = newd.failures;
    cmap.newFailureAvgRunTime = newd.failureAvgRunTime;
  }

  if (!originalData || !newData) {
    return cmap; // No comparison, just display for one side.
  }

  // Normally tests are "lower is better", can be over-ridden with a series option
  cmap.delta = cmap.newValue - cmap.originalValue;

  cmap.deltaPercentage = calcPercentOf(cmap.delta, cmap.originalValue);
  // arbitrary scale from 0-20% multiplied by 5, capped
  // at 100 (so 20% regression === 100% bad)
  cmap.magnitude = Math.min(Math.abs(cmap.deltaPercentage) * 5, 100);

  return cmap;
};

export const createNoiseMetric = function createNoiseMetric(
  cmap,
  name,
  compareResults,
) {
  cmap.name = name;
  cmap.isNoiseMetric = true;

  if (compareResults.has(noiseMetricTitle)) {
    compareResults.get(noiseMetricTitle).push(cmap);
  } else {
    compareResults.set(noiseMetricTitle, [cmap]);
  }
  return compareResults;
};

export const scrollWithOffset = function scrollWithOffset(el) {
  // solution from https://github.com/rafrex/react-router-hash-link/issues/25#issuecomment-536688104

  const yCoordinate = el.getBoundingClientRect().top + window.pageYOffset;
  const yOffset = -35;
  window.scrollTo({ top: yCoordinate + yOffset, behavior: 'smooth' });
};

export const getTitle = (alertSummary) => {
  let title;

  // we should never include downstream alerts in the description
  let alertsInSummary = alertSummary.alerts.filter(
    (alert) =>
      alert.status !== alertStatusMap.downstream ||
      alert.summary_id === alertSummary.id,
  );

  // figure out if there are any regressions -- if there are,
  // the summary should only incorporate those. if there
  // aren't, then use all of them (that aren't downstream,
  // see above)
  const regressions = alertsInSummary.filter((alert) => alert.is_regression);
  if (regressions.length > 0) {
    alertsInSummary = regressions;
  }

  if (alertsInSummary.length > 1) {
    title = `${Math.min(
      ...alertsInSummary.map((alert) => alert.amount_pct),
    )} - ${Math.max(...alertsInSummary.map((alert) => alert.amount_pct))}%`;
  } else if (alertsInSummary.length === 1) {
    title = `${alertsInSummary[0].amount_pct}%`;
  } else {
    title = 'Empty alert';
  }

  // add test info
  const testInfo = [
    ...new Set(alertsInSummary.map((a) => getTestName(a.series_signature))),
  ]
    .sort()
    .join(' / ');
  title += ` ${testInfo}`;
  // add platform info
  const platformInfo = [
    ...new Set(alertsInSummary.map((a) => a.series_signature.machine_platform)),
  ]
    .sort()
    .join(', ');
  title += ` (${platformInfo})`;
  return title;
};

export const updateAlertSummary = async (alertSummaryId, params) =>
  update(getApiUrl(`${endpoints.alertSummary}${alertSummaryId}/`), params);

export const convertParams = (params, value) =>
  Boolean(params[value] !== undefined && parseInt(params[value], 10));

// human readable signature name
const getSignatureName = (testName, platformName) =>
  [testName, platformName].filter((item) => item !== null).join(' ');

export const getHashBasedId = function getHashBasedId(
  testName,
  hashFunction,
  platformName = null,
) {
  const tableSection = platformName === null ? 'header' : 'row';
  const hashValue = hashFunction(getSignatureName(testName, platformName));

  return `table-${tableSection}-${hashValue}`;
};

const retriggerByRevision = async (
  jobId,
  currentRepo,
  isBaseline,
  times,
  props,
) => {
  const { isBaseAggregate, notify } = props;

  // do not retrigger if the base is aggregate (there is a selected time range)
  if (isBaseline && isBaseAggregate) {
    return;
  }

  if (jobId) {
    const job = await JobModel.get(currentRepo.name, jobId);
    JobModel.retrigger([job], currentRepo, notify, times);
  }
};

export const retriggerMultipleJobs = async (
  results,
  baseRetriggerTimes,
  newRetriggerTimes,
  props,
) => {
  // retrigger base revision jobs
  const { projects } = props;

  retriggerByRevision(
    results.originalRetriggerableJobId,
    RepositoryModel.getRepo(results.originalRepoName, projects),
    true,
    baseRetriggerTimes,
    props,
  );
  // retrigger new revision jobs
  retriggerByRevision(
    results.newRetriggerableJobId,
    RepositoryModel.getRepo(results.newRepoName, projects),
    false,
    newRetriggerTimes,
    props,
  );
};
