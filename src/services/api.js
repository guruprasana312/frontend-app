import axios from 'axios';

const API_BASE = `${process.env.REACT_APP_API_BASE || 'http://localhost:8080/'}api/bills`;

console.log('API Base URL:', API_BASE);

// Add request interceptor for debugging
axios.interceptors.request.use(request => {
  console.log('Starting Request:', request.url);
  return request;
});

// Add response interceptor for debugging
axios.interceptors.response.use(
  response => {
    console.log('Response:', response.status, response.data);
    return response;
  },
  error => {
    console.error('API Error:', error.response?.status, error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const getBills = () => axios.get(`${API_BASE}/allBills`);
export const getByCustomer = (customerName) => axios.get(`${API_BASE}/byCustomer?customerName=${encodeURIComponent(customerName)}`);
export const getSorted = () => axios.get(`${API_BASE}/sortedByDate`);
export const addBill = (bill) => axios.post(`${API_BASE}/addBill`, bill);
export const deleteBill = (id) => axios.delete(`${API_BASE}/${id}`);