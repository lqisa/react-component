import React, { Component } from "react";
import PropTypes from "prop-types";

/**
 * fork from https://codesandbox.io/s/30q3mzjv91?module=%2Fsrc%2FOutsideAlerter.js
 */
export default class ClickOuterside extends Component {
  static propTypes = {
    children: PropTypes.element.isRequired
  };

  componentDidMount() {
    document.addEventListener("mousedown", this.handleClickOutside);
  }

  componentWillUnmount() {
    document.removeEventListener("mousedown", this.handleClickOutside);
  }

  /**
   * Set the wrapper ref
   */
  setWrapperRef = node => {
    this.wrapperRef = node;
  };

  /**
   * Alert if clicked on outside of element
   */
  handleClickOutside = event => {
    if (this.wrapperRef && !this.wrapperRef.contains(event.target)) {
      alert("You clicked outside of me!");
    }
  };

  render() {
    return <div ref={this.setWrapperRef}>{this.props.children}</div>;
  }
}
