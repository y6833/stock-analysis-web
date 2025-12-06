from flask import Flask, request, jsonify
import sys
import os


# Kronos 路径设置，兼容 Windows 路径和包导入
kronos_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../Kronos'))
if kronos_path not in sys.path:
    sys.path.append(kronos_path)

# 动态导入 Kronos 预测模块，兼容直接脚本运行
import importlib.util
spec = importlib.util.spec_from_file_location("kronos", os.path.join(kronos_path, "model/kronos.py"))
kronos_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(kronos_module)
predict_stock = getattr(kronos_module, "predict_stock", None)

app = Flask(__name__)

@app.route('/api/predict', methods=['GET'])
def predict():
    symbol = request.args.get('symbol')
    if not symbol:
        return jsonify({'error': '缺少股票代码 symbol'}), 400
    if not predict_stock:
        return jsonify({'error': 'Kronos 预测模块未正确导入'}), 500
    try:
        result = predict_stock(symbol)
        return jsonify({'symbol': symbol, 'prediction': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
