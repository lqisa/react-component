/**
 * usage
 */

/*
// using with react-router
const Home = () => import('./Home')
...
< Route exact path = "/home" render = { props => <AsyncImport module={Home} />} />
...
*/

import React, { Component } from 'react'

class Loading extends Component {
  // just modify it or integrate with other libs
  wrapStyle = {
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    position: 'absolute',
    top: '0',
    left: '0',
    zIndex: '10',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  }
  render () {
    return (
      <div style={this.wrapStyle}>
        <h1>Loading...</h1>
      </div>
    )
  }
}

const ErrorReport = (props) => (
  <>
    <h1 style={{ color: "red" }}>Error:</h1>
    <p>It seems something error happen in module `AsyncImport`:</p>
    <ul>
      <li>{props.err.stack || props.err }</li>
    </ul>
  </>
)

export default class AsyncImport extends Component {
  state = { loading: true, asyncModule: null, err: false }

  componentDidMount() {
    const { module: asyncModule, ...props } = this.props
    console.warn('other props: ', props)
    if (asyncModule) {
      asyncModule().then(res => {
        console.log(res)
        this.setState(state => ({
          loading: false,
          asyncModule: res.default
        }))
      }).catch(err => {
        this.setState({ err })
      })
    } else {
      this.setState({
        loading: false,
        err: 'no \`module\` property is specified'
      })
    }
  }

  render() {
    const { loading, asyncModule: AsyncModule, err } = this.state
    return (
      err ? <ErrorReport err={err} />
        : loading ? <Loading /> : <AsyncModule {...this.props} />
    )
  }
}
