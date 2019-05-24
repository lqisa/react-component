import React, { Component } from 'react'

/**
 * Another way of implementate clickOutside
 * can only be used after focus(click)
 * 
 * fork and modified from:
 * https://stackoverflow.com/questions/32553158/detect-click-outside-react-component/37491578#37491578
 */

 export default class ClickOuterside extends Component {
   state = { focus: true }
   handleFocus = () => {
     this.setState({
       focus: true
     })
   }
   handleBlur = () => {
     alert('blur after click')
     this.setState({
       focus: false
     })
     console.log(this.props.children)
   }
   render () {
     const { focus } = this.state
     // by cloning childEl, we can add our props to `this.props.child`
     // ref: https://medium.com/@markgituma/passing-data-to-props-children-in-react-5399baea0356
     const children = React.Children.map(this.props.children, child => {
       return React.cloneElement(child, { focus })
     })
     return (
       <div style={{ outline: "none" }} tabIndex="-1" onBlur={this.handleBlur} onFocus={this.handleFocus}>
         { children }
       </div>
     )
   }
 }