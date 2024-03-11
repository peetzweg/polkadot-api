import { PropsWithChildren } from "react"
import { TokenProvider } from "../hooks"
import { AccountProvider } from "./AccountProvider"
import { ExtensionProvider } from "./ExtensionProvider"

export const MainProvider: React.FC<PropsWithChildren> = ({ children }) => (
  <TokenProvider.Provider
    value={{
      symbol: "WND",
      decimals: 12,
    }}
  >
    <ExtensionProvider>
      <AccountProvider>{children}</AccountProvider>
    </ExtensionProvider>
  </TokenProvider.Provider>
)
