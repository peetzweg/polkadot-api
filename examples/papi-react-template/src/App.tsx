import "./App.css"
import { Balance } from "./Balance"
import { BlockNumbers } from "./BlocNumbers"
import { ChainProvider, MainProvider } from "./Providers"
import { Teleport } from "./Teleport"
import { paraChainApi, paraChain, relayChain, relayChainApi } from "./api"

function App() {
  return (
    <MainProvider>
      <ChainProvider
        value={{
          chain: relayChain,
          api: relayChainApi,
        }}
      >
        <h2>Westend Relay Chain</h2> <BlockNumbers />
        <Balance />
      </ChainProvider>
      <Teleport />
      <ChainProvider
        value={{
          chain: paraChain,
          api: paraChainApi,
        }}
      >
        <h2>Westend AssetHub</h2> <BlockNumbers />
        <Balance />
      </ChainProvider>
    </MainProvider>
  )
}

export default App
