import { Client } from "smoldot"
import { getSyncProvider } from "@polkadot-api/json-rpc-provider-proxy"
import { ConnectProvider } from "@polkadot-api/sc-provider"

export const getSmoldotProvider = (
  smoldot: Client,
  chainSpec: string,
): ConnectProvider => {
  return getSyncProvider(async () => {
    const chain = await smoldot.addChain({
      chainSpec,
    })

    return (listener, onError) => {
      let listening = true
      ;(async () => {
        do {
          let message = ""
          try {
            message = await chain.nextJsonRpcResponse()
          } catch (e) {
            if (listening) onError()
            return
          }
          if (!listening) break
          listener(message)
        } while (listening)
      })()

      return {
        send(msg: string) {
          chain.sendJsonRpc(msg)
        },
        disconnect() {
          listening = false
          chain.remove()
        },
      }
    }
  })
}
