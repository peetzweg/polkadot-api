import { expect, describe, it } from "vitest"
import { start } from "smoldot"
import { AccountId, createClient } from "@polkadot-api/client"
import { getSmProvider } from "@polkadot-api/sm-provider"
import { WebSocketProvider } from "@polkadot-api/ws-provider/node"
import { createClient as createRawClient } from "@polkadot-api/substrate-client"
import { accounts } from "./keyring"
import { MultiAddress, roc } from "@polkadot-api/descriptors"
import { combineLatest, filter, firstValueFrom, map } from "rxjs"
import { randomBytes } from "crypto"

const smoldot = start()

const rawClient = createRawClient(WebSocketProvider("ws://127.0.0.1:9934/"))

// The retrial system is needed because often the `sync_state_genSyncSpec`
// request fails immediately after starting zombienet.
const getChainspec = async (count = 1): Promise<{}> => {
  try {
    return await rawClient.request<{}>("sync_state_genSyncSpec", [false])
  } catch (e) {
    if (count === 20) throw e
    await new Promise((res) => setTimeout(res, 3_000))
    return getChainspec(count + 1)
  }
}

const chainSpec = JSON.stringify(await getChainspec())
rawClient.destroy()

const accountIdDec = AccountId().dec
const ED = 10_000_000_000n

console.log("got the chainspec")

describe("E2E", async () => {
  console.log("starting the client")
  const client = createClient(getSmProvider(smoldot.addChain({ chainSpec })))
  const api = client.getTypedApi(roc)

  console.log("getting the latest runtime")
  const runtime = await api.runtime.latest()

  it("evaluates constant values", () => {
    const ss58Prefix = api.constants.System.SS58Prefix(runtime)
    expect(ss58Prefix).toEqual(42)

    const ed = api.constants.Balances.ExistentialDeposit(runtime)
    expect(ed).toEqual(ED)
  })

  it("reads from storage", async () => {
    const finalized = await firstValueFrom(client.finalized$)
    const number = await api.query.System.Number.getValue({
      at: finalized.hash,
    })

    expect(number).toEqual(finalized.number)
  })

  it("sr25519 transactions", async () => {
    const amount = ED * 10n
    const targets = Object.values(accounts)
      .map((account) =>
        Object.entries(account)
          .filter(([key]) => key !== "sr25519")
          .map(([, value]) => value),
      )
      .flat()
      .map((x) => accountIdDec(x.publicKey))

    const alice = accounts["alice"]["sr25519"]
    const bob = accounts["bob"]["sr25519"]

    const [aliceInitialNonce, bobInitialNonce] = await Promise.all(
      [alice, bob].map((who) =>
        api.apis.AccountNonceApi.account_nonce(accountIdDec(who.publicKey)),
      ),
    )

    const targetsInitialFreeBalances = await Promise.all(
      targets.map((target) =>
        api.query.System.Account.getValue(target).then((x) => x.data.free),
      ),
    )

    const calls = targets.map(
      (to) =>
        api.tx.Balances.transfer_allow_death({
          dest: MultiAddress.Id(to),
          value: amount,
        }).decodedCall,
    )

    const aliceTransfer = api.tx.Utility.batch_all({ calls: calls.slice(0, 2) })
    const bobTransfer = api.tx.Utility.batch_all({ calls: calls.slice(2) })

    await Promise.all(
      [aliceTransfer, bobTransfer].map((call, idx) =>
        call.signAndSubmit(idx === 0 ? alice : bob),
      ),
    )

    const [alicePostNonce, bobPostNonce] = await Promise.all(
      [alice, bob].map((who) =>
        api.apis.AccountNonceApi.account_nonce(accountIdDec(who.publicKey)),
      ),
    )

    const targetsPostFreeBalances = await Promise.all(
      targets.map((target) =>
        api.query.System.Account.getValue(target).then((x) => x.data.free),
      ),
    )

    expect(targetsPostFreeBalances).toEqual(
      targetsInitialFreeBalances.map((x) => x + amount),
    )
    expect(alicePostNonce).toEqual(aliceInitialNonce + 1)
    expect(bobPostNonce).toEqual(bobInitialNonce + 1)
  })

  it.each(["ecdsa", "ed25519"] satisfies Array<"ecdsa" | "ed25519">)(
    "%s transactions",
    async (type) => {
      const alice = accounts["alice"][type]
      const bob = accounts["bob"][type]

      // let's wait until they have enough balance
      await firstValueFrom(
        combineLatest(
          [alice, bob].map((from) =>
            api.query.System.Account.watchValue(
              accountIdDec(from.publicKey),
            ).pipe(map((x) => x.data.free)),
          ),
        ).pipe(
          filter((balances) => balances.every((balance) => balance >= ED * 2n)),
        ),
      )

      const to = Array(2)
        .fill(null)
        .map(() => accountIdDec(randomBytes(32)))

      const balancesPre = await Promise.all(
        to.map((who) =>
          api.query.System.Account.getValue(who).then(
            ({ data: { free } }) => free,
          ),
        ),
      )

      await Promise.all(
        [alice, bob].map((from, idx) =>
          api.tx.Balances.transfer_allow_death({
            dest: MultiAddress.Id(to[idx]),
            value: ED,
          }).signAndSubmit(from),
        ),
      )

      const balancesPro = await Promise.all(
        to.map((who) =>
          api.query.System.Account.getValue(who).then(
            ({ data: { free } }) => free,
          ),
        ),
      )

      expect(balancesPro).toEqual(balancesPre.map((x) => x + ED))
    },
  )
})
