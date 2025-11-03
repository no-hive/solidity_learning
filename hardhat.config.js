/// ENVVAR
// - COMPILER:      compiler version (default: 0.8.27)
// - SRC:           contracts folder to compile (default: contracts)
// - RUNS:          number of optimization runs (default: 200)
// - IR:            enable IR compilation (default: false)
// - COVERAGE:      enable coverage report (default: false)
// - GAS:           enable gas report (default: false)
// - COINMARKETCAP: coinmarketcap api key for USD value in gas report
// - CI:            output gas report to file instead of stdout

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";

// Hardhat plugins (ESM side-effect imports)
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-ethers";
import "hardhat-exposed";
import "hardhat-gas-reporter";
import "hardhat-ignore-warnings";
import "hardhat-predeploy";
import "solidity-coverage";
import "solidity-docgen";

// Resolve __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse CLI args + env (no prefix)
const argv = yargs(hideBin(process.argv))
  .env("")
  .options({
    // Compilation settings
    compiler: {
      alias: "compileVersion",
      type: "string",
      default: "0.8.27",
    },
    src: {
      alias: "source",
      type: "string",
      default: "contracts",
    },
    runs: {
      alias: "optimizationRuns",
      type: "number",
      default: 200,
    },
    ir: {
      alias: "enableIR",
      type: "boolean",
      default: false,
    },
    evm: {
      alias: "evmVersion",
      type: "string",
      default: "prague",
    },
    // Extra modules
    coverage: {
      type: "boolean",
      default: false,
    },
    gas: {
      alias: "enableGasReport",
      type: "boolean",
      default: false,
    },
    coinmarketcap: {
      alias: "coinmarketcapApiKey",
      type: "string",
    },
  })
  .parseSync();

// Dynamically load any extra Hardhat task files in ./hardhat
const hardhatTasksDir = path.join(__dirname, "hardhat");
if (fs.existsSync(hardhatTasksDir)) {
  for (const f of fs.readdirSync(hardhatTasksDir)) {
    // Import only JS/MJS/TS files (skip dotfiles, maps, etc.)
    if (/\.(mjs|cjs|js|ts)$/.test(f) && !f.endsWith(".d.ts")) {
      // eslint-disable-next-line no-await-in-loop
      await import(pathToFileURL(path.join(hardhatTasksDir, f)).href);
    }
  }
}

// Import docgen config (CJS modules will appear as the default export)
import docgenConfig from "./docs/config";

// Hardhat config (ESM export)
const config = /** @type {import('hardhat/config').HardhatUserConfig} */ ({
  solidity: {
    version: argv.compiler,
    settings: {
      optimizer: {
        enabled: true,
        runs: argv.runs,
      },
      evmVersion: argv.evm,
      viaIR: argv.ir,
      outputSelection: { "*": { "*": ["storageLayout"] } },
    },
  },
  warnings: {
    "contracts-exposed/**/*": {
      "code-size": "off",
      "initcode-size": "off",
    },
    "*": {
      "unused-param": !argv.coverage, // coverage causes unused-param warnings
      "transient-storage": false,
      default: "error",
    },
  },
  networks: {
    hardhat: {
      hardfork: argv.evm,
      // Exposed contracts often exceed the maximum contract size. For normal contracts,
      // we rely on the `code-size` compiler warning, which will cause a compilation error.
      allowUnlimitedContractSize: true,
      initialBaseFeePerGas: argv.coverage ? 0 : undefined,
      enableRip7212: true,
    },
  },
  exposed: {
    imports: true,
    initializers: true,
    exclude: ["vendor/**/*", "**/*WithInit.sol"],
  },
  gasReporter: {
    enabled: argv.gas,
    showMethodSig: true,
    includeBytecodeInJSON: true,
    currency: "USD",
    coinmarketcap: argv.coinmarketcap,
  },
  paths: {
    sources: argv.src,
  },
  docgen: docgenConfig,
});

export default config;
