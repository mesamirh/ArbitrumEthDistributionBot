require("dotenv").config({ path: "./config.env" });

const { ethers } = require("ethers");
const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");

// Load environment variables
const provider = new ethers.providers.JsonRpcProvider(process.env.ARB_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Telegram bot token
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// Load addresses from JSON file
let addresses = [];
let receivedAddresses = [];

try {
  const data = fs.readFileSync("addresses.json", "utf8");
  addresses = JSON.parse(data);
} catch (err) {
  console.error("Error reading addresses.json:", err);
}

try {
  const receivedData = fs.readFileSync("received_addresses.json", "utf8");
  receivedAddresses = JSON.parse(receivedData);
} catch (err) {
  console.error("Error reading received_addresses.json:", err);
  receivedAddresses = []; // Initialize if file doesn't exist
}

// Function to send ETH
// Function to send ETH
async function sendETH(address, cancellationToken) {
  const amountToSend = ethers.utils.parseEther("0.00001");
  const balance = await wallet.getBalance();

  console.log("Wallet Balance:", ethers.utils.formatEther(balance));
  console.log("Amount to Send:", ethers.utils.formatEther(amountToSend));

  if (balance.lt(amountToSend)) {
    console.log("Insufficient funds in the wallet.");
    return "Insufficient funds in the wallet.";
  }

  const gasEstimatePromise = wallet.estimateGas({
    to: address,
    value: amountToSend,
  });

  const gasPricePromise = provider.getGasPrice();

  let gasEstimate, gasPrice;
  try {
    gasEstimate = await gasEstimatePromise;
    gasPrice = await gasPricePromise;
  } catch (error) {
    // Handle error
    console.error("Error estimating gas or fetching gas price:", error);
    return `Error: ${error.message}`;
  }

  const gasCost = gasEstimate.mul(gasPrice);

  console.log("Estimated Gas Cost:", ethers.utils.formatEther(gasCost));

  if (balance.lt(amountToSend.add(gasCost))) {
    console.log("Insufficient funds for gas.");
    return "Insufficient funds for gas.";
  }

  // Fetch the current nonce
  const nonce = await provider.getTransactionCount(wallet.address, "latest");

  const txPromise = wallet.sendTransaction({
    to: address,
    value: amountToSend,
    gasLimit: gasEstimate,
    gasPrice: gasPrice,
    nonce: nonce, // Use the fetched nonce
    chainId: 42161, // for the arbitrum testnet (42161)
  });

  let tx;
  try {
    tx = await txPromise;
  } catch (error) {
    // Handle error
    console.error("Error sending transaction:", error);
    return `Error: ${error.message}`;
  }

  console.log("Transaction sent:", tx.hash);

  try {
    await tx.wait();
    console.log("Transaction confirmed:", tx.hash);

    // Update the receivedAddresses array and write to JSON file
    receivedAddresses.push(address);
    fs.writeFileSync(
      "received_addresses.json",
      JSON.stringify(receivedAddresses)
    );

    return `Transaction successful: ${tx.hash}`;
  } catch (error) {
    // Handle error
    console.error("Error waiting for transaction confirmation:", error);
    return `Error: ${error.message}`;
  }
}

// Telegram bot listener
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text.trim();

  if (ethers.utils.isAddress(text)) {
    if (receivedAddresses.includes(text)) {
      bot.sendMessage(chatId, "This address has already received ETH.");
    } else {
      const result = await sendETH(text);
      bot.sendMessage(chatId, result);
    }
  } else {
    bot.sendMessage(chatId, "Invalid address");
  }
});

// Handle /start command
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "send your arb eth address");
});
