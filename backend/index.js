const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const {
  Client,
  PrivateKey,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TransferTransaction,
  TokenAssociateTransaction,
  AccountBalanceQuery,
  Hbar,
} = require('@hashgraph/sdk');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Initialize Hedera Client
const client = Client.forTestnet();
const operatorId = process.env.HEDERA_ACCOUNT_ID;
const operatorKeyString = process.env.HEDERA_PRIVATE_KEY;

// Validate environment variables
if (!operatorId) {
  console.error('❌ ERROR: HEDERA_ACCOUNT_ID is not set in .env file');
  process.exit(1);
}

if (!operatorKeyString) {
  console.error('❌ ERROR: HEDERA_PRIVATE_KEY is not set in .env file');
  process.exit(1);
}

const operatorKey = PrivateKey.fromString(operatorKeyString);
client.setOperator(operatorId, operatorKey);

console.log('✅ Hedera Client initialized');
console.log(`📍 Operator ID: ${operatorId}`);

// Store transaction logs
let transactionLogs = [];

/**
 * CREATE TOKEN - Mint an NFT Receipt Token
 * POST /api/mint-receipt
 */
app.post('/api/mint-receipt', async (req, res) => {
  try {
    const { recipientId, actionType, metadata } = req.body;

    if (!recipientId || !actionType) {
      return res.status(400).json({
        error: 'Missing required fields: recipientId, actionType',
      });
    }

    // Create a fungible token (representing the receipt)
    const tokenCreateTx = new TokenCreateTransaction()
      .setTokenName(`Receipt-${actionType}`)
      .setTokenSymbol(`RCP-${Date.now()}`)
      .setDecimals(0)
      .setInitialSupply(1)
      .setTreasuryAccountId(operatorId)
      .setTokenType(TokenType.FungibleCommon)
      .setSupplyType(TokenSupplyType.Infinite)
      .freezeWith(client);

    const signTx = await tokenCreateTx.sign(operatorKey);
    const executeTx = await signTx.execute(client);
    const receipt = await executeTx.getReceipt(client);
    const tokenId = receipt.tokenId;

    // Log transaction
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'MINT_RECEIPT',
      actionType,
      tokenId: tokenId.toString(),
      recipient: recipientId,
      metadata,
      transactionId: executeTx.transactionId.toString(),
      status: 'SUCCESS',
    };
    transactionLogs.push(logEntry);

    res.json({
      success: true,
      message: 'Receipt token created successfully',
      tokenId: tokenId.toString(),
      transaction: logEntry,
    });
  } catch (error) {
    console.error('Error minting receipt:', error);
    res.status(500).json({
      error: 'Failed to mint receipt',
      details: error.message,
    });
  }
});

/**
 * TRANSFER TOKEN - Send Receipt to User
 * POST /api/transfer-receipt
 */
app.post('/api/transfer-receipt', async (req, res) => {
  try {
    const { tokenId, toAccountId, amount } = req.body;

    if (!tokenId || !toAccountId || !amount) {
      return res.status(400).json({
        error: 'Missing required fields: tokenId, toAccountId, amount',
      });
    }

    try {
      // Note: TokenAssociateTransaction requires recipient's private key
      // For this demo, we'll skip association and transfer directly
      // In production, the recipient would need to associate the token first
      console.log(`Attempting to transfer token ${tokenId} to ${toAccountId}`);
    } catch (associateError) {
      console.log('Association skipped:', associateError.message);
    }

    // Transfer token from operator to recipient
    const transferTx = new TransferTransaction()
      .addTokenTransfer(tokenId, operatorId, -amount)
      .addTokenTransfer(tokenId, toAccountId, amount)
      .freezeWith(client);

    const signTransferTx = await transferTx.sign(operatorKey);
    const executeTransferTx = await signTransferTx.execute(client);
    const transferReceipt = await executeTransferTx.getReceipt(client);

    // Log transaction
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'TRANSFER_RECEIPT',
      tokenId,
      fromAccount: operatorId,
      toAccount: toAccountId,
      amount,
      transactionId: executeTransferTx.transactionId.toString(),
      status: 'SUCCESS',
    };
    transactionLogs.push(logEntry);

    res.json({
      success: true,
      message: 'Receipt transferred successfully',
      transaction: logEntry,
    });
  } catch (error) {
    console.error('Error transferring receipt:', error);
    res.status(500).json({
      error: 'Failed to transfer receipt',
      details: error.message,
    });
  }
});

/**
 * ASSOCIATE TOKEN - Helper endpoint
 * POST /api/associate-token
 * 
 * Note: For production, recipient should sign this transaction
 * This is for testing/demo purposes only
 */
app.post('/api/associate-token', async (req, res) => {
  try {
    const { tokenId, accountId } = req.body;

    if (!tokenId || !accountId) {
      return res.status(400).json({
        error: 'Missing required fields: tokenId, accountId',
      });
    }

    // Create token association transaction
    const associateTx = new TokenAssociateTransaction()
      .setAccountId(accountId)
      .setTokenIds([tokenId])
      .freezeWith(client);

    // Sign with operator key (for demo)
    // In production, recipient would sign with their key
    const signedTx = await associateTx.sign(operatorKey);
    const executeTx = await signedTx.execute(client);
    const receipt = await executeTx.getReceipt(client);

    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'ASSOCIATE_TOKEN',
      tokenId,
      accountId,
      transactionId: executeTx.transactionId.toString(),
      status: 'SUCCESS',
    };
    transactionLogs.push(logEntry);

    res.json({
      success: true,
      message: 'Token associated successfully',
      transaction: logEntry,
    });
  } catch (error) {
    console.error('Error associating token:', error);
    res.status(500).json({
      error: 'Failed to associate token',
      details: error.message,
    });
  }
});

/**
 * GET ACCOUNT BALANCE
 * GET /api/balance/:accountId
 */
app.get('/api/balance/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;

    const query = new AccountBalanceQuery()
      .setAccountId(accountId);

    const accountBalance = await query.execute(client);

    res.json({
      success: true,
      accountId,
      hbarBalance: accountBalance.hbars.toString(),
      tokens: accountBalance.tokens.toString(),
    });
  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(500).json({
      error: 'Failed to fetch balance',
      details: error.message,
    });
  }
});

/**
 * GET TRANSACTION LOGS
 * GET /api/logs
 */
app.get('/api/logs', (req, res) => {
  res.json({
    success: true,
    logs: transactionLogs,
    count: transactionLogs.length,
  });
});

/**
 * HEALTH CHECK
 * GET /api/health
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Hedera NFT Receipt Backend is running',
    operatorId,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 Operator Account: ${operatorId}`);
  console.log(`🔗 Hedera Network: Testnet`);
});
