import React, { useState, useEffect, useMemo } from 'react';
import { getBills, getByCustomer, getSorted, addBill, deleteBill } from './services/api';
import './App.css';

function App() {
  const [bills, setBills] = useState([]);
  const [formData, setFormData] = useState({
    customerName: '',
    billDate: '',
    amount: '',
    tax: '',
    discount: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    loadBills();
  }, []);

  // const loadBills = async () => {
  //   try {
  //     setLoading(true);
  //     setError('');
  //     const response = await getBills();
  //     setBills(response.data);
  //   } catch (error) {
  //     console.error('Error loading bills:', error);
  //     // setError('Failed to load bills. Please ensure the backend is running.');
  //   } finally {
  //     setLoading(false);
  //   }
  // };
  const loadBills = async () => {
  try {
    setLoading(true);
    setError('');
    const response = await getBills();
    setBills(response.data);
  } catch (error) {
    console.error('Error loading bills:', error.response ? error.response.data : error.message);
    // setError('Failed to load bills. Please ensure the backend is running.');
  } finally {
    setLoading(false);
  }
};

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Validate numeric fields
    if (['amount', 'tax', 'discount'].includes(name)) {
      if (value && isNaN(value)) {
        return; // Don't update if not a valid number
      }
    }
    
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      const billData = {
        ...formData,
        amount: parseFloat(formData.amount || 0),
        tax: parseFloat(formData.tax || 0),
        discount: parseFloat(formData.discount || 0),
        total: parseFloat(formData.amount || 0) + parseFloat(formData.tax || 0) - parseFloat(formData.discount || 0)
      };

      // Optimistic UI update
      const tempId = `temp-${Date.now()}`;
      setBills((prev) => [{ id: tempId, ...billData }, ...prev]);

      await addBill(billData);
      await loadBills();

      setFormData({
        customerName: '',
        billDate: '',
        amount: '',
        tax: '',
        discount: ''
      });
    } catch (error) {
      console.error('Error adding bill:', error);
      setError('Failed to add bill. Try again.');
      loadBills();
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this bill?')) {
      try {
        setError('');
        // Optimistic removal
        setBills((b) => b.filter((bill) => bill.id !== id));
        await deleteBill(id);
      } catch (error) {
        console.error('Error deleting bill:', error);
        setError('Failed to delete bill. Restoring list.');
        loadBills();
      }
    }
  };

  const handleSort = async () => {
    try {
      setError('');
      // Attempt server-side sort; if it fails, fallback to client-side
      try {
        const response = await getSorted();
        setBills(response.data);
      } catch (e) {
        setBills((prev) =>
          [...prev].sort((a, b) =>
            (sortAsc ? 1 : -1) * (new Date(a.billDate) - new Date(b.billDate))
          )
        );
      }
      setSortAsc((s) => !s);
    } catch (error) {
      console.error('Error sorting bills:', error);
      setError('Failed to sort bills.');
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      return;
    }
    try {
      setError('');
      const response = await getByCustomer(searchTerm.trim());
      setBills(response.data);
    } catch (error) {
      console.error('Error searching bills:', error);
      // Client-side filter fallback
      setBills((prev) => prev.filter(b => b.customerName?.toLowerCase().includes(searchTerm.trim().toLowerCase())));
    }
  };

  const handleReset = () => {
    setSearchTerm('');
    setError('');
    loadBills();
  };

  const formatMoney = (amount) => {
    return Number(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const liveTotal = useMemo(() => {
    const amt = parseFloat(formData.amount || 0);
    const tax = parseFloat(formData.tax || 0);
    const disc = parseFloat(formData.discount || 0);
    return (amt + tax - disc).toFixed(2);
  }, [formData.amount, formData.tax, formData.discount]);

  return (
    <div className="App">
      <h1>QuickBill Management</h1>
      
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="customerName"
          placeholder="Customer Name"
          value={formData.customerName}
          onChange={handleInputChange}
          required
        />
        <input
          type="date"
          name="billDate"
          value={formData.billDate}
          onChange={handleInputChange}
          required
        />
        <input
          type="number"
          name="amount"
          placeholder="Amount"
          step="0.01"
          value={formData.amount}
          onChange={handleInputChange}
          required
        />
        <input
          type="number"
          name="tax"
          placeholder="Tax"
          step="0.01"
          value={formData.tax}
          onChange={handleInputChange}
          required
        />
        <input
          type="number"
          name="discount"
          placeholder="Discount"
          step="0.01"
          value={formData.discount}
          onChange={handleInputChange}
          required
        />
        <div>
          Preview Amount: <strong>{formatMoney(liveTotal)}</strong>
        </div>
        <button type="submit">
          Add Bill
        </button>
      </form>

      <div className="search-controls">
        <input
          type="text"
          placeholder="Filter by customer..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button onClick={handleSearch}>
          Search
        </button>
        <button onClick={handleReset}>
          Reset
        </button>
        <button onClick={handleSort}>
          Sort by Date
        </button>
      </div>

      <h2>QuickBill — Bills</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {loading ? (
        <p>Loading...</p>
      ) : bills.length === 0 ? (
        <p>No bills found</p>
      ) : (
        <ul>
          {bills.map((bill) => (
            <li key={bill.id}>
              <div>
                <strong>{bill.customerName}</strong> - {bill.billDate}
              </div>
              <div>Amount: {formatMoney(bill.amount)}</div>
              <div>Tax: {formatMoney(bill.tax)}</div>
              <div>Discount: {formatMoney(bill.discount)}</div>
              <div>Total: {formatMoney(bill.amount + bill.tax - bill.discount)}</div>
              <button onClick={() => handleDelete(bill.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App;