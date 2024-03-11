import React, { useRef, useState } from "react"
import { useSelectedAccount, useToken } from "./hooks"
import { teleportToParaChain, teleportToRelayChain } from "./api"
import { TxEvent } from "@polkadot-api/client"

const teleportFns = {
  para: teleportToParaChain,
  relay: teleportToRelayChain,
}

const TxStatus: React.FC<{ status: TxEvent | null }> = ({ status }) => {
  if (!status) return null
  if (status.type === "validated") return <div>Tx Validated</div>
  if (status.type === "broadcasted") return <div>Tx Broadcasted</div>
  if (status.type === "bestChainBlockIncluded")
    return <div>Tx included in best block {status.block?.hash}</div>

  return <div>Tx finalized {status.block?.hash}</div>
}

export const Teleport: React.FC = () => {
  const { decimals } = useToken()
  const account = useSelectedAccount()
  const ref = useRef<bigint>(0n)
  const [txStatus, setTxStatus] = useState<TxEvent | null>(null)

  const teleport = (to: "para" | "relay") => {
    teleportFns[to](account, ref.current)
      .submit$(account)
      .subscribe((x) => {
        setTxStatus(x)
        if (x.type === "finalized")
          setTimeout(() => {
            setTxStatus(null)
          }, 3_000)
      })
  }

  return (
    <div>
      <h2>Teleport: </h2>
      <button onClick={() => teleport("relay")}>↑ To Relay Chain ↑</button>
      <input
        type="number"
        onChange={(e) => {
          ref.current = BigInt(Number(e.target.value) * 10 ** decimals)
        }}
        defaultValue={0}
      />
      <button onClick={() => teleport("para")}>↓ To ParaChain ↓</button>
      <TxStatus status={txStatus} />
    </div>
  )
}
