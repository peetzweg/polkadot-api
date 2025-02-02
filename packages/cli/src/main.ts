#!/usr/bin/env node

import { Option, program } from "@commander-js/extra-typings"
import { WellKnownChain } from "@substrate/connect"
import { add, generate, remove, update } from "./commands"

program.name("polkadot-api").description("Polkadot API CLI")

const config = new Option("--config <filename>", "Source for the config file")

program
  .command("generate", {
    isDefault: true,
  })
  .description("Generate descriptor files")
  .addOption(config)
  .option("-k, --key <key>", "Key of the descriptor to generate")
  .action(generate)

program
  .command("add")
  .description("Add a new chain spec to the list")
  .argument("<key>", "Key identifier for the chain spec")
  .addOption(config)
  .option("-f, --file <filename>", "Source from metadata encoded file")
  .option("-w, --wsUrl <URL>", "Source from websocket url")
  .option("-c, --chainSpec <filename>", "Source from chain spec file")
  .addOption(
    new Option("-n, --name <name>", "Source from a well-known chain").choices(
      Object.keys(WellKnownChain) as WellKnownChain[],
    ),
  )
  .option("--no-persist", "Do not persist the metadata as a file")
  .action(add)

program
  .command("update")
  .description("Update the metadata files")
  .argument(
    "[keys]",
    "Keys of the metadata files to update, separated by commas. Leave empty for all",
  )
  .addOption(config)
  .action(update)

program
  .command("remove")
  .description("Remove a chain spec from the list")
  .argument("<key>", "Key identifier for the chain spec")
  .addOption(config)
  .action(remove)

program.parse()
