import { appendFileSync, existsSync, rmSync } from "fs"
import { noop } from "@polkadot-api/utils"
import { getChain } from "@polkadot-api/node-polkadot-provider"
import { createClient } from "@polkadot-api/client"
// hint: remember to run the `codegen` script
import ksm, { Queries } from "./descriptors/ksm"
import { start } from "smoldot"
import { getSmoldotProvider } from "./smoldot-provider"
import { withLogsProvider } from "./logger"
import chainSpec from "./ksm"

const getProviderLogs = (id: number) => {
  const WIRE_FILE = `wire-logs-${id}.txt`
  if (existsSync(WIRE_FILE)) rmSync(WIRE_FILE)

  return (message: string) => {
    appendFileSync(WIRE_FILE, `${message}\n`)
  }
}

let tickDate = ""
const setTickDate = () => {
  tickDate = new Date().toISOString()
  setTimeout(setTickDate, 0)
}
setTickDate()

const SMOLDOT_LOGS_FILE = "smoldot-logs.txt"
if (existsSync(SMOLDOT_LOGS_FILE)) rmSync(SMOLDOT_LOGS_FILE)
const appendSmlog = (level: number, target: string, message: string) => {
  appendFileSync(
    SMOLDOT_LOGS_FILE,
    `${tickDate} (${level})${target}\n${message}\n\n`,
  )
}

export const smoldot = start({
  maxLogLevel: 9,
  logCallback: appendSmlog,
})

const provider = withLogsProvider(
  getProviderLogs,
  getSmoldotProvider(smoldot, chainSpec),
)

const polkadotChain = await getChain({
  provider,
  keyring: { getPairs: () => [], onKeyPairsChanged: () => noop },
})

const relayChain = createClient(polkadotChain.connect, { ksm })
const collectives = relayChain

function mapRawIdentity(
  rawIdentity?: Queries["Identity"]["IdentityOf"]["Value"],
) {
  if (!rawIdentity) return rawIdentity

  const {
    info: { additional, ...rawInfo },
  } = rawIdentity

  const additionalInfo = Object.fromEntries(
    additional.map(([key, value]) => {
      return [key.value!, value.value!]
    }),
  )

  const info = Object.fromEntries(
    Object.entries(rawInfo)
      .map(([key, value]) => [key, value.value])
      .filter(([, value]) => value),
  )

  return { ...info, ...additionalInfo }
}

const relevantIdentities =
  await collectives.ksm.query.FellowshipCollective.Members.getEntries()
    .then((allMembers) => allMembers.filter(({ value }) => value >= 4))
    .then((members) =>
      relayChain.ksm.query.Identity.IdentityOf.getValues(
        members.map((m) => m.keyArgs),
      ).then((identities) =>
        identities.map((identity, idx) => ({
          address: members[idx].keyArgs[0],
          rank: members[idx].value,
          ...mapRawIdentity(identity),
        })),
      ),
    )

relevantIdentities.forEach((identity) => console.log(identity))
