from flask import Flask, request, jsonify
import sys
import os
import traceback

# Kronos 路径设置，兼容 Windows 路径和包导入
kronos_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../Kronos'))
if kronos_path not in sys.path:
    sys.path.append(kronos_path)

# 动态导入 Kronos 预测模块，兼容直接脚本运行
import importlib.util
predict_stock = None
kronos_module = None
import_error = None

try:
    spec = importlib.util.spec_from_file_location("kronos", os.path.join(kronos_path, "model/kronos.py"))
    if spec is None:
        raise ImportError(f"无法加载 Kronos 模块: {os.path.join(kronos_path, 'model/kronos.py')} 不存在")
    kronos_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(kronos_module)
    predict_stock = getattr(kronos_module, "predict_stock", None)
    if predict_stock is None:
        import_error = "Kronos 模块中未找到 predict_stock 函数"
except Exception as e:
    import_error = f"导入 Kronos 模块失败: {str(e)}"
    print(f"❌ 导入错误: {import_error}")
    print(f"📁 Kronos 路径: {kronos_path}")
    print(f"📁 模块路径: {os.path.join(kronos_path, 'model/kronos.py')}")
    print(f"📁 路径存在: {os.path.exists(os.path.join(kronos_path, 'model/kronos.py'))}")

app = Flask(__name__)

@app.route('/api/predict', methods=['GET'])
def predict():
    symbol = request.args.get('symbol')
    if not symbol:
        return jsonify({'error': '缺少股票代码 symbol'}), 400
    
    if import_error:
        return jsonify({
            'error': 'Kronos 预测模块导入失败',
            'message': import_error,
            'details': {
                'kronos_path': kronos_path,
                'module_path': os.path.join(kronos_path, 'model/kronos.py'),
                'path_exists': os.path.exists(os.path.join(kronos_path, 'model/kronos.py'))
            }
        }), 500
    
    if not predict_stock:
        return jsonify({
            'error': 'Kronos 预测模块未正确导入',
            'message': 'predict_stock 函数未找到'
        }), 500
    
    try:
        print(f"🔮 开始预测股票: {symbol}")
        result = predict_stock(symbol)
        print(f"✅ 预测完成: {symbol}")
        return jsonify({'symbol': symbol, 'prediction': result})
    except FileNotFoundError as e:
        error_msg = str(e)
        print(f"❌ 文件未找到: {error_msg}")
        # 返回 200 状态码，但包含错误信息，让前端可以友好显示
        return jsonify({
            'error': '预测所需文件未找到',
            'message': error_msg,
            'hint': '请确保模型文件和数据文件存在',
            'serviceAvailable': False,
            'details': {
                'model_path': os.path.join(kronos_path, 'finetune/model.pkl'),
                'tokenizer_path': os.path.join(kronos_path, 'finetune/tokenizer.pkl'),
                'data_dir': os.path.join(kronos_path, 'examples/data'),
            }
        }), 200
    except ValueError as e:
        error_msg = str(e)
        print(f"❌ 数据格式错误: {error_msg}")
        return jsonify({
            'error': '数据格式错误',
            'message': error_msg
        }), 400
    except Exception as e:
        error_msg = str(e)
        error_trace = traceback.format_exc()
        print(f"❌ 预测失败: {error_msg}")
        print(f"📋 错误堆栈:\n{error_trace}")
        return jsonify({
            'error': '预测过程出错',
            'message': error_msg,
            'traceback': error_trace if app.debug else None
        }), 500

@app.route('/health', methods=['GET'])
def health():
    """健康检查端点"""
    return jsonify({
        'status': 'ok',
        'kronos_imported': predict_stock is not None,
        'import_error': import_error,
        'kronos_path': kronos_path
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
