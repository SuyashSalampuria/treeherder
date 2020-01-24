import React from 'react';
import PropTypes from 'prop-types';
import { Pagination, PaginationItem, PaginationLink } from 'reactstrap';

class PaginationGroup extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      page: this.props.page,
      count: 0,
    };
  }

  navigatePage = page => {
    const { fetchData, updateParams } = this.props;
    this.setState({ page }, fetchData);
    updateParams({ page });
  };

  render() {
    const { pageNums } = this.props;
    const { page, count } = this.state;
    return (
      /* The first and last pagination navigation links
         aren't working correctly (icons aren't visible)
         so they haven't been added */
      <Pagination aria-label={`Page ${page}`}>
        {page > 1 && (
          <PaginationItem>
            <PaginationLink
              className="text-info"
              previous
              onClick={() => this.navigatePage(page - 1)}
            />
          </PaginationItem>
        )}
        {pageNums.map(num => (
          <PaginationItem
            key={num}
            active={num === page}
            className="text-info pagination-active"
          >
            <PaginationLink
              className="text-info"
              onClick={() => this.navigatePage(num)}
            >
              {num}
            </PaginationLink>
          </PaginationItem>
        ))}
        {page < count && (
          <PaginationItem>
            <PaginationLink
              className="text-info"
              next
              onClick={() => this.navigatePage(page + 1)}
            />
          </PaginationItem>
        )}
      </Pagination>
    );
  }
}

PaginationGroup.propTypes = {
  pageNums: PropTypes.array.isRequired,
  page: PropTypes.number,
  fetchData: PropTypes.func.isRequired,
};

PaginationGroup.defaultProps = {
  page: 1,
};

export default PaginationGroup;
