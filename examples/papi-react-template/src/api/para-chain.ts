import { createClient } from "@polkadot-api/client"
import { relayChains } from "./polkadot-provider"
import types from "../codegen/wnd-assethub"
import { westend2_asset_hub } from "@substrate/connect-known-chains"

export const paraChain = createClient(
  relayChains.westend2.getParachain(westend2_asset_hub).connect,
)
export const paraChainApi = paraChain.getTypedApi(types)
export const PARACHAIN_ID = 1000
