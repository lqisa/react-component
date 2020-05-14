import { useMemo, useState, useEffect } from 'react'

const timeout = 3 * 1000
let timeId = null
let initVal = null

function initTimeId () {
  timeId = setTimeout(() => {
    timeId = null
    initVal = null
  }, timeout)
}

export default function usePropsHook (initFun = () => Math.random().toFixed(3)) {
  const [needInit, setNeedInit] = useState(true)

  let initState = useMemo(() => {
    if (timeId) {
      clearTimeout(timeId)
      initTimeId()
      return initVal
    } else if (needInit) {
      initTimeId()
      initVal = initFun()
      setNeedInit(false)
    }
  }, [needInit, initFun])

  function clear () {
    timeId = null
    initVal = null
    initState = null
  }

  return { initState, clear }
}
