require("dotenv").config({ path: "./config.env" });

const { ethers } = require("ethers");
const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const readline = require("readline");
const chalk = require("chalk");

// Terminal clear
process.stdout.write("\x1Bc");

// Supported networks configuration
const NETWORKS = {
  arbitrum: {
    name: "Arbitrum",
    rpc: process.env.ARB_URL,
    chainId: 42161,
    tokens: [
      { symbol: "ETH", address: null, decimals: 18 },
      {
        symbol: "USDT",
        address: "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
        decimals: 6,
      },
      {
        symbol: "USDC",
        address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
        decimals: 6,
      },
    ],
  },
  bsc: {
    name: "Binance Smart Chain",
    rpc: process.env.BSC_URL,
    chainId: 56,
    tokens: [
      { symbol: "BNB", address: null, decimals: 18 },
      {
        symbol: "USDT",
        address: "0x55d398326f99059ff775485246999027b3197955",
        decimals: 18,
      },
    ],
  },
  opbnb: {
    name: "opBNB",
    rpc: process.env.OPBNB_URL, // Make sure this exists in your .env as OPBNB_URL
    chainId: 204,
    tokens: [
      { symbol: "BNB", address: null, decimals: 18 },
      {
        symbol: "USDT",
        address: "0x55d398326f99059ff775485246999027b3197955", // Same address as BSC (mirrored on opBNB)
        decimals: 18,
      },
    ],
  },
};

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address,uint256) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  console.log(chalk.bold.cyan("Select network:"));
  Object.keys(NETWORKS).forEach((key, idx) => {
    console.log(chalk.bold.yellow(`${idx + 1}. ${NETWORKS[key].name}`));
  });

  rl.question(chalk.bold.green("Enter network number: "), async (answer) => {
    const idx = parseInt(answer) - 1;
    const keys = Object.keys(NETWORKS);
    if (idx < 0 || idx >= keys.length) {
      console.error(chalk.bold.red("Invalid selection. Exiting."));
      process.exit(1);
    }
    const selectedNetwork = NETWORKS[keys[idx]];
    const provider = new ethers.providers.JsonRpcProvider(selectedNetwork.rpc);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    // Detect balances
    console.log(chalk.bold.cyan("\nDetecting balances..."));
    let tokenBalances = [];
    for (const token of selectedNetwork.tokens) {
      if (!token.address) {
        // Native coin
        const bal = await provider.getBalance(wallet.address);
        tokenBalances.push({ ...token, balance: bal });
      } else {
        const contract = new ethers.Contract(
          token.address,
          ERC20_ABI,
          provider
        );
        try {
          const bal = await contract.balanceOf(wallet.address);
          tokenBalances.push({ ...token, balance: bal });
        } catch (e) {
          tokenBalances.push({ ...token, balance: ethers.BigNumber.from(0) });
        }
      }
    }

    // Show balances
    console.log(chalk.bold.magenta("\nAvailable tokens:"));
    tokenBalances.forEach((t, i) => {
      const formatted = ethers.utils.formatUnits(t.balance, t.decimals);
      console.log(chalk.bold.yellow(`${i + 1}. ${t.symbol}: ${formatted}`));
    });

    rl.question(
      chalk.bold.green("Select token number to send: "),
      (tokenIdx) => {
        const tIdx = parseInt(tokenIdx) - 1;
        if (tIdx < 0 || tIdx >= tokenBalances.length) {
          console.error(chalk.bold.red("Invalid token selection. Exiting."));
          process.exit(1);
        }
        const selectedToken = tokenBalances[tIdx];

        rl.question(
          chalk.bold.green(`Enter amount of ${selectedToken.symbol} to send: `),
          (amount) => {
            rl.close();
            startBot(selectedNetwork, selectedToken, amount);
          }
        );
      }
    );
  });
}

function startBot(network, token, amountStr) {
  const provider = new ethers.providers.JsonRpcProvider(network.rpc);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

  let addresses = [];
  let receivedAddresses = [];

  try {
    const data = fs.readFileSync("addresses.json", "utf8");
    addresses = JSON.parse(data);
  } catch (err) {
    console.error(chalk.red("Error reading addresses.json:"), err);
  }

  try {
    const receivedData = fs.readFileSync("received_addresses.json", "utf8");
    receivedAddresses = JSON.parse(receivedData);
  } catch (err) {
    console.error(chalk.red("Error reading received_addresses.json:"), err);
    receivedAddresses = [];
  }

  async function sendToken(address) {
    let amountToSend = ethers.utils.parseUnits(amountStr, token.decimals);
    if (token.symbol === "ETH" || token.symbol === "BNB") {
      const balance = await wallet.getBalance();
      if (balance.lt(amountToSend)) {
        return chalk.red("Insufficient funds in the wallet.");
      }
      let gasEstimate, gasPrice;
      try {
        gasEstimate = await wallet.estimateGas({
          to: address,
          value: amountToSend,
        });
        gasPrice = await provider.getGasPrice();
      } catch (error) {
        return chalk.red(`Error: ${error.message}`);
      }
      const gasCost = gasEstimate.mul(gasPrice);
      if (balance.lt(amountToSend.add(gasCost))) {
        return chalk.red("Insufficient funds for gas.");
      }
      try {
        const tx = await wallet.sendTransaction({
          to: address,
          value: amountToSend,
          gasLimit: gasEstimate,
          gasPrice: gasPrice,
          chainId: network.chainId,
        });
        await tx.wait();
        receivedAddresses.push(address);
        fs.writeFileSync(
          "received_addresses.json",
          JSON.stringify(receivedAddresses)
        );
        return chalk.green(`Transaction successful: ${tx.hash}`);
      } catch (error) {
        return chalk.red(`Error: ${error.message}`);
      }
    } else {
      // ERC20/BEP20
      const contract = new ethers.Contract(token.address, ERC20_ABI, wallet);
      const balance = await contract.balanceOf(wallet.address);
      if (balance.lt(amountToSend)) {
        return chalk.red("Insufficient token balance.");
      }
      try {
        const tx = await contract.transfer(address, amountToSend);
        await tx.wait();
        receivedAddresses.push(address);
        fs.writeFileSync(
          "received_addresses.json",
          JSON.stringify(receivedAddresses)
        );
        return chalk.green(`Token sent! Tx: ${tx.hash}`);
      } catch (error) {
        return chalk.red(`Error: ${error.message}`);
      }
    }
  }

  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text.trim();

    if (ethers.utils.isAddress(text)) {
      if (receivedAddresses.includes(text)) {
        bot.sendMessage(chatId, "This address has already received tokens.");
      } else {
        const result = await sendToken(text);
        bot.sendMessage(chatId, result.replace(/\x1b\[[0-9;]*m/g, ""));
      }
    } else {
      bot.sendMessage(chatId, "Invalid address");
    }
  });

  bot.onText(/\/start/, (msg) => {
    bot.sendMessage(
      msg.chat.id,
      `Send your ${network.name} address to receive ${token.symbol}`
    );
  });

  console.log(
    chalk.bgGreen.black(
      `Bot started on ${network.name} using token ${token.symbol}`
    )
  );
}

main();
