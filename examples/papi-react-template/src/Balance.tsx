import { useEffect, useState } from "react"
import { useChain, useSelectedAccount, useToken } from "./hooks"
import { formatCurrency } from "./utils"
import { merge } from "rxjs"

export const Balance: React.FC = () => {
  const { api } = useChain()
  const { decimals, symbol } = useToken()
  const account = useSelectedAccount()
  const [balance, setBalance] = useState<{
    free: bigint
    reserved: bigint
    frozen: bigint
  } | null>()

  useEffect(() => {
    setBalance(null)

    const subscription = merge(
      api.query.System.Account.getValue(account),
      api.query.System.Account.watchValue(account, "best"),
    ).subscribe(({ data }) => {
      setBalance(data)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [api, account])

  return !balance ? (
    <div>Loading...</div>
  ) : (
    <div>
      <strong>Free Balance:</strong>{" "}
      {formatCurrency(balance.free, decimals, { nDecimals: 2 })} {symbol}
    </div>
  )
}
