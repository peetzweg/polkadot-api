import { ConnectProvider } from "@polkadot-api/sc-provider"

let nextId = 1
export const withLogsProvider =
  (
    getPersistLog: (id: number) => (log: string) => void,
    input: ConnectProvider,
  ): ConnectProvider =>
  (onMsg) => {
    const persistLog = getPersistLog(nextId++)
    let token: any
    let tickDate = ""
    const setTickDate = () => {
      tickDate = new Date().toISOString()
      token = setTimeout(setTickDate, 0)
    }
    setTickDate()

    const result = input((msg) => {
      onMsg(msg)
      persistLog(`${tickDate}-<<-${msg}`)
    })

    return {
      ...result,
      send: (msg) => {
        result.send(msg)
        persistLog(`${tickDate}->>-${msg}`)
      },
      disconnect() {
        result.disconnect()
        clearTimeout(token)
      },
    }
  }

interface Log {
  tick: number
  type: "<<" | ">>"
  msg: string
}

const rawLogsToLogs = (rawLogs: string[]): Log[] => {
  const result = new Array<Log>(rawLogs.length)

  let prevDate = ""
  let tick = -1

  for (let i = 0; i < rawLogs.length; i++) {
    const [, date, type, msg] = rawLogs[i].match(/^(.{24})-(.{2})-(.*)$/)!
    if (date !== prevDate) tick++
    result[i] = {
      tick,
      type: type as any,
      msg,
    }
  }

  return result
}

export const replayLogs = (rawLogs: string[]): ConnectProvider => {
  const logs = rawLogsToLogs(rawLogs)

  return (onMsg) => {
    let idx = 0
    let tick = -1
    let token: any

    const sendNextmessages = () => {
      let log = logs[idx]
      if (!log) {
        clearTimeout(token)
        return
      }

      if (log.tick < tick) throw new Error("shit hit the fan")
      while (log.type === "<<" && log.tick === tick) {
        onMsg(log.msg)
        log = logs[++idx]
      }
    }

    const setTickDate = () => {
      tick++
      token = setTimeout(setTickDate, 0)
      sendNextmessages()
    }
    setTickDate()

    return {
      send: (msg) => {
        const expected = logs[idx++].msg
        if (expected !== msg) {
          clearTimeout(token)
          console.error(expected, msg)
          throw new Error("shit hit the fan")
        }
        sendNextmessages()
      },
      disconnect: () => {
        clearTimeout(token)
      },
    }
  }
}
