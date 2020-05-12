import React from 'react';
import PropTypes from 'prop-types';

import SimpleTooltip from '../shared/SimpleTooltip';
import ProgressBar from '../perfherder/ProgressBar';
import { hashFunction } from '../helpers/utils';
import TableAverage from '../perfherder/compare/TableAverage';
import RetriggerButton from '../perfherder/compare/RetriggerButton';

import { displayNumber, formatNumber, getHashBasedId } from './helpers';

export default class CompareTableRow extends React.PureComponent {
  getColorClass = (data, type) => {
    const { className, isRegression, isImprovement } = data;
    if (type === 'bar' && !isRegression && !isImprovement) return 'secondary';
    if (type === 'background' && className === 'warning')
      return `bg-${className}`;
    if (type === 'text' && className) return `text-${className}`;
    return className;
  };

  deltaTooltipText = (delta, percentage, improvement) =>
    `Mean difference: ${formatNumber(displayNumber(delta))} (= ${Math.abs(
      displayNumber(percentage),
    )}% ${improvement ? 'better' : 'worse'})`;

  render() {
    const { testName, rowLevelResults, hashFunction } = this.props;

    return (
      <React.Fragment>
        <tr>
          <th className="text-left">Average Run time</th>
          <td>{rowLevelResults.originalValue}</td>
          <td>
            {rowLevelResults.originalValue < rowLevelResults.newValue && (
              <span>&lt;</span>
            )}
            {rowLevelResults.originalValue > rowLevelResults.newValue && (
              <span>&gt;</span>
            )}
          </td>
          <td>{rowLevelResults.newValue}</td>
          <td>{rowLevelResults.delta}</td>
          {rowLevelResults.delta ? (
            <ProgressBar
              magnitude={rowLevelResults.delta}
              regression={!rowLevelResults.newIsBetter}
              color={this.getColorClass(rowLevelResults, 'bar')}
            />
          ) : null}
        </tr>
        <tr
          id={getHashBasedId(testName, hashFunction, rowLevelResults.name)}
          aria-label="Comparison table row"
          ref={(el) => {
            this.rowTitle = el;
          }}
        >
          <th className="text-left">Failures</th>
          <td>{rowLevelResults.originalFailures}</td>
          <td>
            {rowLevelResults.originalFailures < rowLevelResults.newFailures && (
              <span>&lt;</span>
            )}
            {rowLevelResults.originalFailures > rowLevelResults.newFailures && (
              <span>&gt;</span>
            )}
          </td>
          <td>{rowLevelResults.newFailures}</td>
          <td>{rowLevelResults.delta}</td>
          {rowLevelResults.delta ? (
            <ProgressBar
              magnitude={rowLevelResults.delta}
              color={this.getColorClass(rowLevelResults, 'bar')}
            />
          ) : null}
        </tr>
        <tr
          id={getHashBasedId(testName, hashFunction, rowLevelResults.name)}
          aria-label="Comparison table row"
          ref={(el) => {
            this.rowTitle = el;
          }}
        >
          <th className="text-left">Failures Average Duration</th>
          <td>{rowLevelResults.originalFailureAvgRunTime}</td>
          <td>
            {rowLevelResults.originalFailureAvgRunTime <
              rowLevelResults.newFailureAvgRunTime && <span>&lt;</span>}
            {rowLevelResults.originalFailureAvgRunTime >
              rowLevelResults.newFailureAvgRunTime && <span>&gt;</span>}
          </td>
          <td>{rowLevelResults.newFailureAvgRunTime}</td>
          <td>{rowLevelResults.delta}</td>
          {rowLevelResults.delta ? (
            <ProgressBar
              magnitude={rowLevelResults.delta}
              color={this.getColorClass(rowLevelResults, 'bar')}
            />
          ) : null}
        </tr>
      </React.Fragment>
    );
  }
}

CompareTableRow.propTypes = {
  testName: PropTypes.string.isRequired,
  onModalOpen: PropTypes.func.isRequired,
  hashFunction: PropTypes.func,
  onPermalinkClick: PropTypes.func,
};

CompareTableRow.defaultProps = {
  hashFunction,
  onPermalinkClick: undefined,
};
