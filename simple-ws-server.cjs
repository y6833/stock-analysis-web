const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080, path: '/ws' });

wss.on('connection', ws => {
    console.log('客户端已连接');
    ws.send('WebSocket 连接成功！');

    ws.on('message', msg => {
        console.log('收到消息:', msg.toString());
        ws.send('收到: ' + msg);
    });

    ws.on('close', () => {
        console.log('客户端已断开连接');
    });
});

console.log('WebSocket 服务已启动，监听 ws://localhost:8080/ws');