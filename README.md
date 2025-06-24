# Arbitrum-eth-distribution-bot

## Features

- Distributes a user-specified amount of Arbitrum ETH, USDT, or USDC (on Arbitrum) or BNB/USDT (on BSC) to a user's address.
- Supports both Arbitrum and Binance Smart Chain (BSC) networks.
- Ensures each address can only receive tokens once.
- Interactive, colorful CLI for network, token, and amount selection.
- Tracks sent addresses to prevent double sending.

## Prerequisites

- Node.js (v16 or higher)
- npm (Node Package Manager)
- A Telegram bot token
- An Ethereum wallet private key with sufficient funds for distribution
- RPC URLs for Arbitrum and BSC

## Setup Instructions

### 1. Clone the Repository

```sh
git clone https://github.com/mesamirh/arbitrum-eth-distribution-bot.git
cd ArbitrumEthDistributionBot
```

### 2. Install Dependencies

```sh
npm install
```

### 3. Create `config.env` File

Create a `config.env` file in the project root with the following content:

```
BOT_TOKEN=your-telegram-bot-token
PRIVATE_KEY=your-ethereum-wallet-private-key
ARB_URL=https://arb1.arbitrum.io/rpc
BSC_URL=https://bsc-dataseed.binance.org/
```

> **Never share your `config.env` file or commit it to version control!**

### 4. Run the Bot

```sh
node bot.js
```

## Usage

1. Run the bot script using Node.js:

    ```sh
    node bot.js
    ```

2. Follow the CLI prompts to:
    - Select the network (Arbitrum or BSC)
    - Select the token (ETH, USDT, USDC, or BNB)
    - Enter the amount to send

3. Interact with the Bot on Telegram:
    - Open Telegram and start a chat with your bot.
    - Send your address to the bot.
    - The bot will check if the address has already received tokens. If not, it will send the specified amount and log the transaction in `received_addresses.json`.

## Files and Structure

- `bot.js`: The main script for the Telegram bot.
- `config.env`: Environment variables for bot token, private key, and RPC URLs.
- `addresses.json` & `received_addresses.json`: JSON files to keep track of addresses that have already received tokens.
- `package.json`: Project configuration and dependencies.

## Security Notes

- **Do not use your main wallet!** Use a dedicated wallet with limited funds.
- The bot does not restrict who can request tokens. Anyone with access to your bot can request tokens.
- Make sure your `config.env` and JSON files are in `.gitignore` and never shared publicly.

## Troubleshooting

- **Error: `Cannot find module 'telegraf'`**  
  Ensure all dependencies are installed correctly by running `npm install`.

- **Error: `404: Not Found`**  
  Verify your bot token in the `config.env` file is correct.

- **Transaction Errors:**  
  Ensure your wallet has sufficient funds for transactions and the gas limit is set appropriately.

## License

This project is licensed under the MIT License.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.
