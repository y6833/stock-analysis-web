# AI 配置管理（CC Switch 兼容）

## 入口

- 管理后台 → **AI 配置** Tab
- 或直接访问 `/admin?tab=ai-providers`

## CC Switch JSON 格式

```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "sk-xxx",
    "ANTHROPIC_BASE_URL": "https://yinli.one",
    "ANTHROPIC_MODEL": "claude-sonnet-4-6",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "gemini-3.1-pro-preview",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "claude-opus-4-7",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "claude-opus-4-7-thinking",
    "ANTHROPIC_REASONING_MODEL": "claude-sonnet-4-6-thinking"
  },
  "includeCoAuthoredBy": false
}
```

## 使用步骤

1. 点击 **导入 CC Switch JSON**，粘贴上述格式配置
2. 在左侧列表选中配置，点击 **启用**
3. 点击 **测试连接** 验证中转站可用
4. 所有 AI 功能（推荐、金股、条件筛选）自动使用当前激活配置

## 支持的 Provider

| 类型 | 识别字段 |
|------|----------|
| Anthropic / CC Switch | `ANTHROPIC_AUTH_TOKEN` |
| DeepSeek | `DEEPSEEK_API_KEY` |
| OpenAI 兼容 | `OPENAI_API_KEY` |

Anthropic 中转站（如 yinli.one）优先走 OpenAI 兼容 `/v1/chat/completions`，失败时回退原生 Messages API。

## 存储位置

配置保存在服务端 `server/data/ai-provider-profiles.json`（已加入 `.gitignore`，不会提交密钥）。

## API

| 方法 | 路径 |
|------|------|
| GET | `/api/admin/ai-providers` |
| POST | `/api/admin/ai-providers/import` |
| POST | `/api/admin/ai-providers/:id/activate` |
| GET | `/api/admin/ai-providers/:id/export` |
| POST | `/api/admin/ai-providers/test` |

均需管理员登录。
