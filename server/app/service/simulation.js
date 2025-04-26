'use strict';

const Service = require('egg').Service;

class SimulationService extends Service {
  // 获取用户的所有模拟账户
  async getAccounts(userId) {
    const { app } = this;
    const accounts = await app.mysql.select('simulation_accounts', {
      where: { user_id: userId },
      orders: [['created_at', 'desc']]
    });
    
    return accounts.map(account => ({
      id: account.id,
      name: account.name,
      cash: parseFloat(account.cash),
      createdAt: account.created_at
    }));
  }
  
  // 创建新的模拟账户
  async createAccount(userId, name, initialCash = 100000) {
    const { app } = this;
    const result = await app.mysql.insert('simulation_accounts', {
      user_id: userId,
      name,
      cash: initialCash
    });
    
    if (result.affectedRows === 1) {
      return {
        id: result.insertId,
        name,
        cash: initialCash,
        positions: [],
        transactions: []
      };
    }
    
    throw new Error('创建账户失败');
  }
  
  // 获取账户详情
  async getAccount(userId, accountId) {
    const { app } = this;
    const account = await app.mysql.get('simulation_accounts', {
      id: accountId,
      user_id: userId
    });
    
    if (!account) return null;
    
    // 获取持仓和交易记录
    const positions = await this.getPositions(userId, accountId);
    const transactions = await this.getTransactions(userId, accountId);
    
    return {
      id: account.id,
      name: account.name,
      cash: parseFloat(account.cash),
      positions,
      transactions,
      createdAt: account.created_at
    };
  }
  
  // 获取账户持仓
  async getPositions(userId, accountId) {
    const { app } = this;
    
    // 验证账户所有权
    const account = await app.mysql.get('simulation_accounts', {
      id: accountId,
      user_id: userId
    });
    
    if (!account) return [];
    
    const positions = await app.mysql.select('simulation_positions', {
      where: { account_id: accountId },
      orders: [['updated_at', 'desc']]
    });
    
    // 获取最新价格并计算收益
    const enrichedPositions = await Promise.all(positions.map(async (position) => {
      let currentPrice = parseFloat(position.avg_price);
      
      try {
        // 尝试获取实时价格
        const stockPrice = await this.service.stock.getStockQuote(position.stock_code);
        if (stockPrice && stockPrice.price) {
          currentPrice = stockPrice.price;
        }
      } catch (err) {
        this.ctx.logger.warn(`获取股票 ${position.stock_code} 价格失败:`, err);
      }
      
      const quantity = position.quantity;
      const avgPrice = parseFloat(position.avg_price);
      const value = quantity * currentPrice;
      const profit = value - (avgPrice * quantity);
      const profitPercent = (profit / (avgPrice * quantity)) * 100;
      
      return {
        id: position.id,
        accountId: position.account_id,
        stockCode: position.stock_code,
        stockName: position.stock_name,
        quantity,
        avgPrice,
        currentPrice,
        value,
        profit,
        profitPercent,
        updatedAt: position.updated_at
      };
    }));
    
    return enrichedPositions;
  }
  
  // 获取交易记录
  async getTransactions(userId, accountId) {
    const { app } = this;
    
    // 验证账户所有权
    const account = await app.mysql.get('simulation_accounts', {
      id: accountId,
      user_id: userId
    });
    
    if (!account) return [];
    
    const transactions = await app.mysql.select('simulation_transactions', {
      where: { account_id: accountId },
      orders: [['transaction_date', 'desc']]
    });
    
    return transactions.map(transaction => ({
      id: transaction.id,
      accountId: transaction.account_id,
      stockCode: transaction.stock_code,
      stockName: transaction.stock_name,
      action: transaction.action,
      quantity: transaction.quantity,
      price: parseFloat(transaction.price),
      amount: parseFloat(transaction.amount),
      transactionDate: transaction.transaction_date
    }));
  }
  
  // 执行交易
  async executeTrade(userId, accountId, stockCode, stockName, action, quantity, price) {
    const { app } = this;
    
    // 验证账户所有权
    const account = await app.mysql.get('simulation_accounts', {
      id: accountId,
      user_id: userId
    });
    
    if (!account) {
      throw new Error('账户不存在或无权限访问');
    }
    
    // 计算交易金额
    const amount = quantity * price;
    
    // 开始事务
    const conn = await app.mysql.beginTransaction();
    
    try {
      if (action === 'buy') {
        // 检查资金是否足够
        if (parseFloat(account.cash) < amount) {
          throw new Error('资金不足');
        }
        
        // 扣除资金
        await conn.update('simulation_accounts', {
          cash: parseFloat(account.cash) - amount
        }, {
          where: { id: accountId }
        });
        
        // 查找现有持仓
        const position = await conn.get('simulation_positions', {
          account_id: accountId,
          stock_code: stockCode
        });
        
        if (position) {
          // 更新现有持仓
          const totalCost = position.quantity * parseFloat(position.avg_price) + amount;
          const totalQuantity = position.quantity + quantity;
          const newAvgPrice = totalCost / totalQuantity;
          
          await conn.update('simulation_positions', {
            quantity: totalQuantity,
            avg_price: newAvgPrice,
            updated_at: new Date()
          }, {
            where: { id: position.id }
          });
        } else {
          // 创建新持仓
          await conn.insert('simulation_positions', {
            account_id: accountId,
            stock_code: stockCode,
            stock_name: stockName,
            quantity,
            avg_price: price,
            created_at: new Date(),
            updated_at: new Date()
          });
        }
      } else if (action === 'sell') {
        // 查找现有持仓
        const position = await conn.get('simulation_positions', {
          account_id: accountId,
          stock_code: stockCode
        });
        
        if (!position || position.quantity < quantity) {
          throw new Error('持仓不足');
        }
        
        // 增加资金
        await conn.update('simulation_accounts', {
          cash: parseFloat(account.cash) + amount
        }, {
          where: { id: accountId }
        });
        
        // 更新持仓
        if (position.quantity === quantity) {
          // 全部卖出，删除持仓
          await conn.delete('simulation_positions', {
            id: position.id
          });
        } else {
          // 部分卖出，更新持仓
          await conn.update('simulation_positions', {
            quantity: position.quantity - quantity,
            updated_at: new Date()
          }, {
            where: { id: position.id }
          });
        }
      } else {
        throw new Error('无效的交易类型');
      }
      
      // 创建交易记录
      const tradeRecord = await conn.insert('simulation_transactions', {
        account_id: accountId,
        stock_code: stockCode,
        stock_name: stockName,
        action,
        quantity,
        price,
        amount,
        transaction_date: new Date()
      });
      
      // 提交事务
      await conn.commit();
      
      // 获取更新后的账户信息
      const updatedAccount = await this.getAccount(userId, accountId);
      
      return {
        success: true,
        transaction: {
          id: tradeRecord.insertId,
          accountId,
          stockCode,
          stockName,
          action,
          quantity,
          price,
          amount,
          transactionDate: new Date()
        },
        account: updatedAccount
      };
    } catch (err) {
      // 回滚事务
      await conn.rollback();
      throw err;
    }
  }
}

module.exports = SimulationService;
