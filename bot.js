const { Telegraf } = require('telegraf');
const { ethers } = require('ethers');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

// Initialize the provider and wallet
const provider = new ethers.providers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Initialize the bot
const bot = new Telegraf(process.env.BOT_TOKEN);

// Load sent addresses from JSON file
let sentAddresses = [];
const sentAddressesPath = 'addresses.json';

// Function to load sent addresses from the JSON file
function loadSentAddresses() {
    if (fs.existsSync(sentAddressesPath)) {
        const data = fs.readFileSync(sentAddressesPath);
        try {
            sentAddresses = JSON.parse(data);
        } catch (error) {
            console.error('Error parsing JSON data:', error);
            sentAddresses = [];
        }
    } else {
        fs.writeFileSync(sentAddressesPath, JSON.stringify([]));
    }
}

// Function to save sent addresses to the JSON file
function saveSentAddresses() {
    fs.writeFileSync(sentAddressesPath, JSON.stringify(sentAddresses, null, 2));
}

// Load the sent addresses at startup
loadSentAddresses();

bot.start((ctx) => ctx.reply('Send me your Ethereum address to receive 0.00001 ETH!'));

bot.on('text', async (ctx) => {
    const ethAddress = ctx.message.text;

    // Check if the address has already received ETH
    if (sentAddresses.includes(ethAddress)) {
        ctx.reply('This address has already received ETH.');
        return;
    }

    // Check wallet balance
    const balance = await wallet.getBalance();
    const amountToSend = ethers.utils.parseEther('0.00001');
    
    // Estimate gas limit
    const tx = {
        to: ethAddress,
        value: amountToSend,
        type: 2,
    };
    try {
        const gasLimit = await provider.estimateGas(tx);
        const feeData = await provider.getFeeData();
        
        // Adjust gas fee calculations
        const maxFeePerGas = feeData.maxFeePerGas;
        const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
        const estimatedGasCost = maxFeePerGas.mul(gasLimit);

        console.log('Wallet Balance:', ethers.utils.formatEther(balance));
        console.log('Amount to Send:', ethers.utils.formatEther(amountToSend));
        console.log('Estimated Gas Cost:', ethers.utils.formatEther(estimatedGasCost));

        if (balance.lt(amountToSend.add(estimatedGasCost))) {
            ctx.reply('Insufficient funds in the wallet.');
            return;
        }

        // Send ETH
        tx.gasLimit = gasLimit;
        tx.maxFeePerGas = maxFeePerGas;
        tx.maxPriorityFeePerGas = maxPriorityFeePerGas;

        // Send the transaction
        const transactionResponse = await wallet.sendTransaction(tx);
        await transactionResponse.wait();

        // Add the address to the list of sent addresses and save it
        sentAddresses.push(ethAddress);
        saveSentAddresses();

        ctx.reply(`Sent 0.00001 ETH to ${ethAddress}. Transaction Hash: ${transactionResponse.hash}`);
    } catch (error) {
        console.error('Error sending ETH:', error);
        ctx.reply('Error sending ETH: ' + error.message);
    }
});

bot.launch();
