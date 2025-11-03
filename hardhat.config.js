// ESM: Все импорты на верхнем уровне, без require
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Импорт Hardhat-плагинов
import '@nomicfoundation/hardhat-chai-matchers';
import '@nomicfoundation/hardhat-ethers';
import 'hardhat-exposed';
import 'hardhat-gas-reporter';
import 'hardhat-ignore-warnings';
import 'hardhat-predeploy';
import 'solidity-coverage';
import 'solidity-docgen';

// ESM-способ определить __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Yargs для разбора опций CLI/ENV-переменных
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
const argv = yargs(hideBin(process.argv))
  .env('')
  .options({
    compiler: { type: 'string', default: process.env.COMPILER || '0.8.27' },
    src: { type: 'string', default: process.env.SRC || 'contracts' },
    runs: { type: 'number', default: process.env.RUNS ? Number(process.env.RUNS) : 200 },
    ir: { type: 'boolean', default: process.env.IR === 'true' },
    evm: { type: 'string', default: process.env.EVM || 'prague' },
    coverage: { type: 'boolean', default: process.env.COVERAGE === 'true' },
    gas: { type: 'boolean', default: process.env.GAS === 'true' },
    coinmarketcap: { type: 'string', default: process.env.COINMARKETCAP },
  })
  .parseSync();

// Если требуется динамически прогрузить дополнительные Hardhat таски
if (fs.existsSync(path.join(__dirname, 'hardhat'))) {
  const taskFiles = fs.readdirSync(path.join(__dirname, 'hardhat'));
  for (const f of taskFiles) {
    // Динамический ESM импорт
    await import(path.join(__dirname, 'hardhat', f));
  }
}

// Импортируйте док-ген config корректно
let docgenConfig = {};
try {
  docgenConfig = (await import('./docs/config.js')).default;
} catch (e) {
  // если нет docgen, игнорим
}

/**
 * Конфиг Hardhat. Экспорт производится через 'export default'
 */
export default {
  solidity: {
    version: argv.compiler,
    settings: {
      optimizer: { enabled: true, runs: argv.runs },
      evmVersion: argv.evm,
      viaIR: argv.ir,
      outputSelection: { '*': { '*': ['storageLayout'] } },
    },
  },
  warnings: {
    'contracts-exposed/**/*': { 'code-size': 'off', 'initcode-size': 'off' },
    '*': {
      'unused-param': !argv.coverage,
      'transient-storage': false,
      default: 'error',
    },
  },
  networks: {
    hardhat: {
      hardfork: argv.evm,
      allowUnlimitedContractSize: true,
      initialBaseFeePerGas: argv.coverage ? 0 : undefined,
      enableRip7212: true,
    },
  },
  exposed: {
    imports: true,
    initializers: true,
    exclude: ['vendor/**/*', '**/*WithInit.sol'],
  },
  gasReporter: {
    enabled: argv.gas,
    showMethodSig: true,
    includeBytecodeInJSON: true,
    currency: 'USD',
    coinmarketcap: argv.coinmarketcap,
  },
  paths: { sources: argv.src },
  docgen: docgenConfig,
};
