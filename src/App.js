import React, { Component } from 'react';
import './App.css';
import fetch from 'isomorphic-fetch';
import { sortBy } from 'lodash';
import classNames from 'classnames';
import PropTypes from 'prop-types';

const DEFAULT_QUERY = 'redux';
const DEFAULT_HPP = 100;
const PATH_BASE = 'https://hn.algolia.com/api/v1';
const PATH_SEARCH = '/search';
const PARAM_SEARCH = 'query=';
const PARAM_PAGE = 'page=';
const PARAM_HPP = 'hitsPerPage=';

const SORTS = {
  NONE: list => list,
  TITLE: list => sortBy(list, 'title'),
  AUTHOR: list => sortBy(list, 'author'),
  COMMENTS: list => sortBy(list, 'num_comments').reverse(),
  POINTS: list => sortBy(list, 'points').reverse()
};

const updateSearchTopStoriesState = (hits, page) => prevState => {
  const { results, searchKey } = prevState;
  const oldHits = results && results[searchKey] ? results[searchKey].hits : [];
  const updatedHits = [...oldHits, ...hits];
  return {
    results: {
      ...results,
      [searchKey]: {
        hits: updatedHits,
        page
      }
    },
    isLoading: false
  };
};

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      results: null,
      searchKey: '',
      searchItem: DEFAULT_QUERY,
      error: null,
      isLoading: false
    };

    // bind this
    this.needsToSearchTopStories = this.needsToSearchTopStories.bind(this);
    this.setSearchTopStories = this.setSearchTopStories.bind(this);
    this.fetchSearchTopStories = this.fetchSearchTopStories.bind(this);
    this.onSearchChange = this.onSearchChange.bind(this);
    this.onSearchSubmit = this.onSearchSubmit.bind(this);
    this.onDismiss = this.onDismiss.bind(this);
  }
  setSearchTopStories(result) {
    const { hits, page } = result;

    this.setState(updateSearchTopStoriesState(hits, page));
  }

  fetchSearchTopStories(searchItem, page = 0) {
    this.setState({ isLoading: true });
    fetch(
      `${PATH_BASE}${PATH_SEARCH}?${PARAM_SEARCH}${searchItem}&${PARAM_PAGE}${page}&${PARAM_HPP}${DEFAULT_HPP}`
    )
      .then(response => response.json())
      .then(result => this.setSearchTopStories(result))
      .catch(e => this.setState({ error: e }));
  }

  componentDidMount() {
    const { searchItem } = this.state;
    this.setState({ searchKey: searchItem });
    this.fetchSearchTopStories(searchItem);
  }

  onDismiss(id) {
    const { searchKey, results } = this.state;
    const { hits, page } = results[searchKey];

    const isNotId = item => item.objectID !== id;
    const updatedHits = hits.filter(isNotId);
    this.setState({
      results: {
        ...results,
        [searchKey]: { hits: updatedHits, page }
      }
    });
  }

  onSearchChange(event) {
    this.setState({ searchItem: event.target.value });
  }

  onSearchSubmit(event) {
    const { searchItem } = this.state;
    this.setState({ searchKey: searchItem });
    if (this.needsToSearchTopStories(searchItem)) {
      this.fetchSearchTopStories(searchItem);
    }
    event.preventDefault();
  }

  needsToSearchTopStories(searchItem) {
    return !this.state.results[searchItem];
  }

  render() {
    const { results, searchKey, searchItem, error, isLoading } = this.state;

    const page =
      (results && results[searchKey] && results[searchKey].page) || 0;

    const list =
      (results && results[searchKey] && results[searchKey].hits) || [];

    return (
      <div className="page">
        <div className="interactions">
          <Search
            value={searchItem}
            onSearchChange={this.onSearchChange}
            onSearchSubmit={this.onSearchSubmit}
          >
            Search
          </Search>
          {error ? (
            <div className="interactions">
              <p>Something went wrong.</p>
            </div>
          ) : (
            <Table list={list} onDismiss={this.onDismiss} />
          )}
        </div>
        <div className="interactions">
          <ButtonWithLoading
            isLoading={isLoading}
            onClick={() => this.fetchSearchTopStories(searchKey, page + 1)}
          >
            More
          </ButtonWithLoading>
        </div>
      </div>
    );
  }
}

class Search extends Component {
  componentDidMount() {
    if (this.input) {
      this.input.focus();
    }
  }

  render() {
    const { value, onSearchChange, onSearchSubmit, children } = this.props;
    return (
      <form onSubmit={onSearchSubmit}>
        <input
          type="text"
          value={value}
          onChange={onSearchChange}
          ref={node => {
            this.input = node;
          }}
        />
        <button type="submit">{children}</button>
      </form>
    );
  }
}

const largeColumn = {
  width: '40%'
};

const midColumn = {
  width: '30%'
};

const smallColumn = {
  width: '10%'
};

class Table extends Component {
  constructor(props) {
    super(props);
    this.state = {
      sortKey: 'NONE',
      isSortReverse: false
    };
    this.onSort = this.onSort.bind(this);
  }

  onSort(sortKey) {
    const isSortReverse =
      this.state.sortKey === sortKey && !this.state.isSortReverse;
    this.setState({ sortKey, isSortReverse });
  }

  render() {
    const { list, onDismiss } = this.props;
    const { sortKey, isSortReverse } = this.state;
    const sortedList = SORTS[sortKey](list);
    const reverseSortedList = isSortReverse ? sortedList.reverse() : sortedList;
    return (
      <div className="table">
        <div className="table-header">
          <span style={largeColumn}>
            <Sort
              sortKey={'TITLE'}
              onSort={this.onSort}
              activeSortKey={sortKey}
            >
              Title
            </Sort>
          </span>
          <span style={midColumn}>
            <Sort
              sortKey={'AUTHOR'}
              onSort={this.onSort}
              activeSortKey={sortKey}
            >
              Author
            </Sort>
          </span>
          <span style={smallColumn}>
            <Sort
              sortKey={'COMMENTS'}
              onSort={this.onSort}
              activeSortKey={sortKey}
            >
              Comments
            </Sort>
          </span>
          <span style={smallColumn}>
            <Sort
              sortKey={'POINTS'}
              onSort={this.onSort}
              activeSortKey={sortKey}
            >
              Points
            </Sort>
          </span>
          <span style={smallColumn}>Archive</span>
        </div>
        {reverseSortedList.map(item => (
          <div key={item.objectID} className="table-row">
            <span style={largeColumn}>
              <a href={item.url}>{item.title}</a>
            </span>
            <span style={midColumn}>{item.author}</span>
            <span style={smallColumn}>{item.num_comments}</span>
            <span style={smallColumn}>{item.points}</span>
            <span style={smallColumn}>
              <Button
                onClick={() => onDismiss(item.objectID)}
                className="button-inline"
              >
                Dismiss
              </Button>
            </span>
          </div>
        ))}
      </div>
    );
  }
}

// const Table = ({ list, onDismiss, sortKey, onSort, isSortReverse }) => {
//   const sortedList = SORTS[sortKey](list);
//   const reverseSortedList = isSortReverse ? sortedList.reverse() : sortedList;
//   return (
//     <div className="table">
//       <div className="table-header">
//         <span style={largeColumn}>
//           <Sort sortKey={'TITLE'} onSort={onSort} activeSortKey={sortKey}>
//             Title
//           </Sort>
//         </span>
//         <span style={midColumn}>
//           <Sort sortKey={'AUTHOR'} onSort={onSort} activeSortKey={sortKey}>
//             Author
//           </Sort>
//         </span>
//         <span style={smallColumn}>
//           <Sort sortKey={'COMMENTS'} onSort={onSort} activeSortKey={sortKey}>
//             Comments
//           </Sort>
//         </span>
//         <span style={smallColumn}>
//           <Sort sortKey={'POINTS'} onSort={onSort} activeSortKey={sortKey}>
//             Points
//           </Sort>
//         </span>
//         <span style={smallColumn}>Archive</span>
//       </div>
//       {reverseSortedList.map(item => (
//         <div key={item.objectID} className="table-row">
//           <span style={largeColumn}>
//             <a href={item.url}>{item.title}</a>
//           </span>
//           <span style={midColumn}>{item.author}</span>
//           <span style={smallColumn}>{item.num_comments}</span>
//           <span style={smallColumn}>{item.points}</span>
//           <span style={smallColumn}>
//             <Button
//               onClick={() => onDismiss(item.objectID)}
//               className="button-inline"
//             >
//               Dismiss
//             </Button>
//           </span>
//         </div>
//       ))}
//     </div>
//   );
// };

Table.propTypes = {
  list: PropTypes.arrayOf(
    PropTypes.shape({
      objectID: PropTypes.string.isRequired,
      author: PropTypes.string,
      url: PropTypes.string,
      num_comments: PropTypes.number,
      points: PropTypes.number
    })
  ).isRequired,
  onDismiss: PropTypes.func.isRequired
};

const Sort = ({ sortKey, onSort, activeSortKey, children }) => {
  const sortClass = classNames('button-inline', {
    'button-active': sortKey === activeSortKey
  });

  return (
    <Button onClick={() => onSort(sortKey)} className={sortClass}>
      {children}
    </Button>
  );
};

const Button = ({ onClick, className, children }) => (
  <button onClick={onClick} className={className} type="button">
    {children}
  </button>
);

Button.propTypes = {
  onClick: PropTypes.func.isRequired,
  className: PropTypes.string,
  children: PropTypes.node.isRequired
};

Button.defaultProps = {
  className: ''
};

const Loading = () => <div>Loading...</div>;

// HOC
const withLoading = Component => ({ isLoading, ...rest }) =>
  isLoading ? <Loading /> : <Component {...rest} />;

const ButtonWithLoading = withLoading(Button);

export default App;
export { Button, Search, Table };
