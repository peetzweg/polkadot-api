import { SS58String, createClient } from "@polkadot-api/client"
import { getInjectedExtensions } from "@polkadot-api/legacy-polkadot-provider"
import { createContext, useContext, useEffect, useState } from "react"
import { paraChainApi, relayChainApi } from "./api"

let latest: string[] = []
const watchers = new Set<(value: string[]) => void>()

const watcher = () => {
  getInjectedExtensions().then((x) => {
    watchers.forEach((cb) => {
      latest = x
      cb(x)
    })
  })
  setTimeout(watcher, latest.length > 0 ? 1000 : 0)
}
watcher()

export const useAvailableExtensions = () => {
  const [extensions, setExtensions] = useState<string[]>([])

  useEffect(() => {
    setExtensions(latest)
    watchers.add(setExtensions)

    return () => {
      watchers.delete(setExtensions)
    }
  }, [])

  return extensions
}

export const SelectedAccountCtx = createContext<SS58String | null>(null)
export const useSelectedAccount = () => useContext(SelectedAccountCtx)!

export const chainCtx = createContext<{
  chain: ReturnType<typeof createClient>
  api: typeof paraChainApi | typeof relayChainApi
} | null>(null)
export const useChain = () => useContext(chainCtx)!

export const TokenProvider = createContext<{
  symbol: string
  decimals: number
}>({ symbol: "DOT", decimals: 10 })
export const useToken = () => useContext(TokenProvider)

export const useBlockNumber = (type: "finalized" | "best") => {
  const { chain } = useChain()
  const [blockNumber, setBlockNumber] = useState<number | null>()

  useEffect(() => {
    let missingBest = true
    let latestFinalized: number | null = null

    const sub1 = chain.finalized$.subscribe(({ number }) => {
      latestFinalized = number
      if (type === "finalized" || missingBest) setBlockNumber(number)
    })

    const sub2 = chain.bestBlocks$.subscribe((x) => {
      if (x.length === 0) {
        missingBest = true
        setBlockNumber(latestFinalized)
      } else {
        missingBest = false
        setBlockNumber(x[x.length - 1].number)
      }
    })

    return () => {
      sub1.unsubscribe()
      sub2.unsubscribe()
    }
  }, [chain, type])

  return blockNumber
}
