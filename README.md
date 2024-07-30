# Arbitrum-eth-distribution-bot
## Features

- Distributes 0.000001 Arbitrum ETH to a user's Ethereum address.
- Ensures each address can only receive ETH once.
- Hash.

## Prerequisites

- Node.js (v16 or higher)
- npm (Node Package Manager)
- A Telegram bot token
- An Ethereum wallet private key with sufficient ETH for distribution

## Setup Instructions

### 1. Clone the Repository
```
git clone https://github.com/mesamirh/arbitrum-eth-distribution-bot.git

cd ArbitrumEthDistributionBot
```
### 2. Install Dependencies
```
npm install
```
### 3. Create `config.env` File
Create a file named `config.env` in the root directory of the project and add your environment variables:
```
BOT_TOKEN=your-telegram-bot-token
PRIVATE_KEY=your-ethereum-wallet-private-key
ARB_URL=rpc-here // like https://arb1.arbitrum.io/rpc
```
### 4. Run the Bot
```
node bot.js
```

### Files and Structure
- `bot.js`: The main script for the Telegram bot.
- `config.env`: Environment variables for bot token and private key.
- `addresses.json & received_addresses.json`: JSON file to keep track of addresses that have already received ETH.
- `package.json`: Project configuration and dependencies.

### Usage
1. Run the bot script using Node.js:
```
node bot.js
```
2. Interact with the Bot:

- Open Telegram and start a chat with your bot.
- Send your Ethereum address to the bot.
- The bot will check if the address has already received ETH. If not, it will send 0.000001 ETH to the address and log the transaction in `addresses.json`.

### Troubleshooting
- Error: `Cannot find module 'telegraf'`:   
Ensure all dependencies are installed correctly by running `npm install`.

- Error: `404: Not Found`:  
Verify your bot token in the `.env` file is correct.

- Transaction Errors:
Ensure your wallet has sufficient ETH for transactions and the gas limit is set appropriately.

### License
This project is licensed under the MIT License.

### Contributing
Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.
