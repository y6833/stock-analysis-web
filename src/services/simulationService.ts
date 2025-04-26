import axios from 'axios';
import { getToken } from '@/utils/auth';

const API_URL = '/api';

// 模拟账户类型
export interface SimulationAccount {
  id: number;
  name: string;
  cash: number;
  positions?: SimulationPosition[];
  transactions?: SimulationTransaction[];
  createdAt?: string;
}

// 模拟持仓类型
export interface SimulationPosition {
  id: number;
  accountId: number;
  stockCode: string;
  stockName: string;
  quantity: number;
  avgPrice: number;
  currentPrice?: number;
  value?: number;
  profit?: number;
  profitPercent?: number;
  updatedAt?: string;
}

// 模拟交易记录类型
export interface SimulationTransaction {
  id: number;
  accountId: number;
  stockCode: string;
  stockName: string;
  action: 'buy' | 'sell';
  quantity: number;
  price: number;
  amount: number;
  transactionDate: string;
}

// 交易参数类型
export interface TradeParams {
  stockCode: string;
  stockName: string;
  action: 'buy' | 'sell';
  quantity: number;
  price: number;
}

// 设置请求头中的认证信息
const getAuthHeaders = () => {
  const token = getToken();
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

// 模拟交易服务
export const simulationService = {
  // 获取用户的所有模拟账户
  async getAccounts(): Promise<SimulationAccount[]> {
    try {
      const response = await axios.get(`${API_URL}/simulation/accounts`, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('获取模拟账户失败:', error);
      throw error;
    }
  },

  // 创建新的模拟账户
  async createAccount(name: string, initialCash: number = 100000): Promise<SimulationAccount> {
    try {
      const response = await axios.post(
        `${API_URL}/simulation/accounts`, 
        { name, initialCash }, 
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('创建模拟账户失败:', error);
      throw error;
    }
  },

  // 获取特定账户详情
  async getAccount(accountId: number): Promise<SimulationAccount> {
    try {
      const response = await axios.get(
        `${API_URL}/simulation/accounts/${accountId}`, 
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('获取账户详情失败:', error);
      throw error;
    }
  },

  // 获取账户持仓
  async getPositions(accountId: number): Promise<SimulationPosition[]> {
    try {
      const response = await axios.get(
        `${API_URL}/simulation/accounts/${accountId}/positions`, 
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('获取持仓失败:', error);
      throw error;
    }
  },

  // 获取交易记录
  async getTransactions(accountId: number): Promise<SimulationTransaction[]> {
    try {
      const response = await axios.get(
        `${API_URL}/simulation/accounts/${accountId}/transactions`, 
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('获取交易记录失败:', error);
      throw error;
    }
  },

  // 执行交易
  async executeTrade(accountId: number, params: TradeParams): Promise<any> {
    try {
      const response = await axios.post(
        `${API_URL}/simulation/accounts/${accountId}/trade`, 
        params, 
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('执行交易失败:', error);
      throw error;
    }
  },

  // 获取股票实时行情
  async getStockQuote(stockCode: string): Promise<any> {
    try {
      const response = await axios.get(`${API_URL}/stocks/${stockCode}/quote`);
      return response.data;
    } catch (error) {
      console.error('获取股票行情失败:', error);
      throw error;
    }
  }
};
