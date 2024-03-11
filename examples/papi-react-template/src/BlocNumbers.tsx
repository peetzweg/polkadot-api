import { useBlockNumber } from "./hooks"

const formatNumber = new Intl.NumberFormat().format

export const BlockNumbers: React.FC = () => {
  const finalized = useBlockNumber("finalized")
  const best = useBlockNumber("best")

  if (!finalized) return null

  return (
    <div
      style={{
        marginTop: "-25px",
        marginBottom: "15px",
      }}
    >
      (#{formatNumber(finalized)}
      {best && best !== finalized ? <> - #{formatNumber(best)}</> : null})
    </div>
  )
}
