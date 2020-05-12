import React from 'react';
import { Button, Table } from 'reactstrap';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHashtag } from '@fortawesome/free-solid-svg-icons';

import { hashFunction } from '../helpers/utils';
import RetriggerButton from '../perfherder/compare/RetriggerButton';

import { getHashBasedId } from './helpers';
import CompareTableRow from './CompareTableRow';

export default class CompareTable extends React.PureComponent {
  render() {
    const {
      data,
      testName,
      user,
      hasSubtests,
      isBaseAggregate,
      onPermalinkClick,
      history,
      onModalOpen,
    } = this.props;

    return (
      <Table
        id={getHashBasedId(testName, hashFunction)}
        aria-label="Comparison table"
        sz="small"
        className="compare-table mb-0 px-0"
        key={testName}
        innerRef={(el) => {
          this.header = el;
        }}
      >
        <thead>
          <tr className="subtest-header bg-lightgray">
            <th className="text-left, table-width-lg">
              <span>{testName}</span>
            </th>
            <th className="table-width-lg">Base</th>
            {/* empty for less than/greater than data */}
            <th className="table-width-sm" aria-label="Comparison" />
            <th className="table-width-lg">New</th>
            <th className="table-width-lg">Delta</th>
            <th className="table-width-lg">Magnitude of Difference</th>
          </tr>
        </thead>
        <tbody>
          {data.map((rowLevelResults) => (
            <CompareTableRow
              key={rowLevelResults.jobName}
              rowLevelResults={rowLevelResults}
              hashFunction={hashFunction}
              onModalOpen={onModalOpen}
              {...this.props}
            />
          ))}
        </tbody>
      </Table>
    );
  }
}

CompareTable.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({})),
  testName: PropTypes.string.isRequired,
  onModalOpen: PropTypes.func.isRequired,
  hashFunction: PropTypes.func,
  onPermalinkClick: PropTypes.func,
};

CompareTable.defaultProps = {
  data: null,
  hashFunction,
  onPermalinkClick: undefined,
};
