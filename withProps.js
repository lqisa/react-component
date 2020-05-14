import React from 'react'
const timeout = 3 * 1000

function computeInitState (initFun) {
  let initValue = null
  let clearTimeoutId = null

   // 每次调用组件重置定时器
  function resetTimeId () {
    if (clearTimeoutId) {
      clearTimeout(clearTimeoutId)
    }
    clearTimeoutId = setTimeout(() => {
      initValue = null
      clearTimeoutId = null
    }, timeout)
  }

  function clear () {
    initValue = null
    clearTimeoutId = null
  }

  function getInitValue () {
    if (clearTimeoutId === null) {
      resetTimeId()
      initValue = initFun()
      return initValue
    }
    resetTimeId()
    return initValue
  }
  return {
    getInitValue,
    clear
  }
}

function withProps (initFun, Compoment) {
  const { getInitValue } = computeInitState(initFun)
  return class extends React.Component {
    tmpProps = {
      ...this.props,
      ...getInitValue()
    }

    // 销毁之后需清除定时器和对应数据
    // componentWillUnmount() {
    //   clear()
    // }

    render () {
      return <Compoment {...this.tmpProps} />
    }
  }
}

export default withProps
