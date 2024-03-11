import { createClient } from "@polkadot-api/client"
import { relayChains } from "./polkadot-provider"
import types from "../codegen/wnd"

export const relayChain = createClient(relayChains.westend2.connect)
export const relayChainApi = relayChain.getTypedApi(types)
