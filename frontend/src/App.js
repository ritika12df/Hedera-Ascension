import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://hedera-ascension.onrender.com';

function App() {
  const [activeTab, setActiveTab] = useState('mint');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [logs, setLogs] = useState([]);

  // Form states
  const [mintForm, setMintForm] = useState({
    recipientId: '',
    actionType: 'Buy',
    metadata: '',
  });

  const [transferForm, setTransferForm] = useState({
    tokenId: '',
    toAccountId: '',
    amount: 1,
  });

  const [balanceForm, setBalanceForm] = useState({
    accountId: '',
  });

  const [balanceResult, setBalanceResult] = useState(null);

  // Fetch logs on component mount and periodically
  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/logs`);
      setLogs(response.data.logs);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  // Mint Receipt
  const handleMintReceipt = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await axios.post(`${API_URL}/api/mint-receipt`, {
        recipientId: mintForm.recipientId,
        actionType: mintForm.actionType,
        metadata: mintForm.metadata,
      });

      setMessage(`✅ Receipt minted! Token ID: ${response.data.tokenId}`);
      setMintForm({
        recipientId: '',
        actionType: 'Buy',
        metadata: '',
      });
      fetchLogs();
    } catch (error) {
      setMessage(`❌ Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Transfer Receipt
  const handleTransferReceipt = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await axios.post(`${API_URL}/api/transfer-receipt`, {
        tokenId: transferForm.tokenId,
        toAccountId: transferForm.toAccountId,
        amount: transferForm.amount,
      });

      setMessage(`✅ Receipt transferred successfully!`);
      setTransferForm({
        tokenId: '',
        toAccountId: '',
        amount: 1,
      });
      fetchLogs();
    } catch (error) {
      setMessage(`❌ Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Check Balance
  const handleCheckBalance = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setBalanceResult(null);

    try {
      const response = await axios.get(
        `${API_URL}/api/balance/${balanceForm.accountId}`
      );

      setBalanceResult(response.data);
      setMessage('✅ Balance retrieved successfully!');
    } catch (error) {
      setMessage(`❌ Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="header">
        <h1>🎫 NFT Receipt System</h1>
        <p>Hedera DeFi & Tokenization Challenge</p>
      </header>

      <div className="container">
        <div className="tabs">
          <button
            className={`tab-btn ${activeTab === 'mint' ? 'active' : ''}`}
            onClick={() => setActiveTab('mint')}
          >
            🎁 Mint Receipt
          </button>
          <button
            className={`tab-btn ${activeTab === 'transfer' ? 'active' : ''}`}
            onClick={() => setActiveTab('transfer')}
          >
            📤 Transfer Receipt
          </button>
          <button
            className={`tab-btn ${activeTab === 'balance' ? 'active' : ''}`}
            onClick={() => setActiveTab('balance')}
          >
            💰 Check Balance
          </button>
        </div>

        {message && (
          <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        <div className="content">
          {/* Mint Receipt Tab */}
          {activeTab === 'mint' && (
            <div className="form-container">
              <h2>Mint NFT Receipt</h2>
              <form onSubmit={handleMintReceipt}>
                <div className="form-group">
                  <label>Recipient Account ID</label>
                  <input
                    type="text"
                    placeholder="0.0.xxxxxxx"
                    value={mintForm.recipientId}
                    onChange={(e) =>
                      setMintForm({ ...mintForm, recipientId: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Action Type</label>
                  <select
                    value={mintForm.actionType}
                    onChange={(e) =>
                      setMintForm({ ...mintForm, actionType: e.target.value })
                    }
                  >
                    <option value="Buy">Buy</option>
                    <option value="Register">Register</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Metadata (JSON)</label>
                  <textarea
                    placeholder='{"item": "product", "price": "100 HBAR"}'
                    value={mintForm.metadata}
                    onChange={(e) =>
                      setMintForm({ ...mintForm, metadata: e.target.value })
                    }
                  />
                </div>

                <button type="submit" disabled={loading} className="btn btn-primary">
                  {loading ? 'Processing...' : 'Mint Receipt'}
                </button>
              </form>
            </div>
          )}

          {/* Transfer Receipt Tab */}
          {activeTab === 'transfer' && (
            <div className="form-container">
              <h2>Transfer NFT Receipt</h2>
              <form onSubmit={handleTransferReceipt}>
                <div className="form-group">
                  <label>Token ID</label>
                  <input
                    type="text"
                    placeholder="0.0.xxxxxxx"
                    value={transferForm.tokenId}
                    onChange={(e) =>
                      setTransferForm({ ...transferForm, tokenId: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Recipient Account ID</label>
                  <input
                    type="text"
                    placeholder="0.0.xxxxxxx"
                    value={transferForm.toAccountId}
                    onChange={(e) =>
                      setTransferForm({ ...transferForm, toAccountId: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Amount</label>
                  <input
                    type="number"
                    min="1"
                    value={transferForm.amount}
                    onChange={(e) =>
                      setTransferForm({
                        ...transferForm,
                        amount: parseInt(e.target.value),
                      })
                    }
                  />
                </div>

                <button type="submit" disabled={loading} className="btn btn-primary">
                  {loading ? 'Processing...' : 'Transfer Receipt'}
                </button>
              </form>
            </div>
          )}

          {/* Balance Check Tab */}
          {activeTab === 'balance' && (
            <div className="form-container">
              <h2>Check Account Balance</h2>
              <form onSubmit={handleCheckBalance}>
                <div className="form-group">
                  <label>Account ID</label>
                  <input
                    type="text"
                    placeholder="0.0.xxxxxxx"
                    value={balanceForm.accountId}
                    onChange={(e) =>
                      setBalanceForm({ accountId: e.target.value })
                    }
                    required
                  />
                </div>

                <button type="submit" disabled={loading} className="btn btn-primary">
                  {loading ? 'Checking...' : 'Check Balance'}
                </button>
              </form>

              {balanceResult && (
                <div className="balance-result">
                  <h3>Balance Result</h3>
                  <p>
                    <strong>Account:</strong> {balanceResult.accountId}
                  </p>
                  <p>
                    <strong>HBAR Balance:</strong> {balanceResult.hbarBalance}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Transaction Logs */}
        <div className="logs-container">
          <h2>📝 Transaction Logs</h2>
          <div className="logs-list">
            {logs.length === 0 ? (
              <p className="no-logs">No transactions yet</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="log-item">
                  <div className="log-header">
                    <span className="log-type">{log.type}</span>
                    <span className="log-time">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="log-details">
                    <p>
                      <strong>Status:</strong> {log.status}
                    </p>
                    {log.actionType && (
                      <p>
                        <strong>Action:</strong> {log.actionType}
                      </p>
                    )}
                    {log.tokenId && (
                      <p>
                        <strong>Token/ID:</strong> {log.tokenId}
                      </p>
                    )}
                    <p>
                      <strong>TX ID:</strong>{' '}
                      <code>{log.transactionId}</code>
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
