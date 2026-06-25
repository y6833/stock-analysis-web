<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { aiProviderService } from '@/services/aiProviderService'
import type { AIProviderProfile, AIProviderPreset, CcSwitchConfig } from '@/types/aiProvider'
import { ANTHROPIC_ENV_FIELDS, DEEPSEEK_ENV_FIELDS } from '@/types/aiProvider'
import type { AIProviderListResponse } from '@/types/aiProvider'

const loading = ref(false)
const testing = ref(false)
const activeProfileId = ref<string | null>(null)
const profiles = ref<AIProviderProfile[]>([])
const presets = ref<AIProviderPreset[]>([])
const runtime = ref<AIProviderListResponse['runtime']>(null)
const selectedId = ref<string | null>(null)
const editMode = ref<'visual' | 'json'>('visual')
const importVisible = ref(false)
const importJson = ref('')

const selectedProfile = computed(() => profiles.value.find((p) => p.id === selectedId.value))

const formName = ref('')
const formConfig = ref<CcSwitchConfig>({ env: {}, includeCoAuthoredBy: false })
const jsonText = ref('')

const envFields = computed(() => {
  const provider = selectedProfile.value?.provider
  if (provider === 'deepseek') return DEEPSEEK_ENV_FIELDS
  return ANTHROPIC_ENV_FIELDS
})

async function load() {
  loading.value = true
  try {
    const data = await aiProviderService.list()
    activeProfileId.value = data.activeProfileId
    profiles.value = data.profiles
    runtime.value = data.runtime
    if (!selectedId.value && data.profiles.length) {
      selectedId.value = data.activeProfileId || data.profiles[0].id
    }
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function syncFormFromProfile(profile: AIProviderProfile) {
  formName.value = profile.name
  formConfig.value = {
    env: { ...profile.config.env },
    includeCoAuthoredBy: profile.config.includeCoAuthoredBy ?? false,
  }
  jsonText.value = JSON.stringify(
    { env: profile.config.env, includeCoAuthoredBy: profile.config.includeCoAuthoredBy ?? false },
    null,
    2,
  )
}

watch(selectedProfile, (p) => {
  if (p) syncFormFromProfile(p)
})

async function handleActivate(id: string) {
  try {
    await aiProviderService.activate(id)
    ElMessage.success('已切换 AI 配置')
    await load()
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || '切换失败')
  }
}

async function handleSave() {
  if (!selectedId.value) return
  try {
    let config = formConfig.value
    if (editMode.value === 'json') {
      config = JSON.parse(jsonText.value)
    }
    await aiProviderService.update(selectedId.value, { name: formName.value, config })
    ElMessage.success('保存成功')
    await load()
  } catch (e: any) {
    ElMessage.error(e.message || e.response?.data?.message || '保存失败')
  }
}

async function handleCreateFromPreset(preset: AIProviderPreset) {
  try {
    const profile = await aiProviderService.create(preset.name, JSON.parse(JSON.stringify(preset.template)))
    ElMessage.success(`已创建「${profile.name}」`)
    selectedId.value = profile.id
    await load()
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || '创建失败')
  }
}

async function handleDelete() {
  if (!selectedId.value) return
  await ElMessageBox.confirm('确定删除此配置？', '确认', { type: 'warning' })
  try {
    await aiProviderService.remove(selectedId.value)
    selectedId.value = null
    ElMessage.success('已删除')
    await load()
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || '删除失败')
  }
}

async function handleImport() {
  try {
    const profile = await aiProviderService.importCcSwitch(importJson.value)
    importVisible.value = false
    importJson.value = ''
    selectedId.value = profile.id
    ElMessage.success('CC Switch 配置导入成功')
    await load()
  } catch (e: any) {
    ElMessage.error(e.message || e.response?.data?.message || '导入失败，请检查 JSON 格式')
  }
}

async function handleExport() {
  if (!selectedId.value) return
  try {
    const data = await aiProviderService.exportCcSwitch(selectedId.value)
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cc-switch-${formName.value || 'config'}.json`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || '导出失败')
  }
}

async function handleTest() {
  testing.value = true
  try {
    const result = await aiProviderService.test(selectedId.value || undefined)
    ElMessage.success(`连接成功 (${result.latencyMs}ms): ${result.response}`)
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || '连接测试失败')
  } finally {
    testing.value = false
  }
}

function providerLabel(p: string) {
  const map: Record<string, string> = {
    anthropic: 'Anthropic',
    deepseek: 'DeepSeek',
    openai: 'OpenAI',
    custom: '自定义',
  }
  return map[p] || p
}

onMounted(async () => {
  try {
    presets.value = await aiProviderService.getPresets()
  } catch {
    /* ignore */
  }
  await load()
})
</script>

<template>
  <div class="ai-management" v-loading="loading">
    <div class="ai-management__header">
      <div>
        <h2>AI 配置管理</h2>
        <p class="subtitle">类似 CC Switch — 管理多套 AI Provider，一键切换，支持 JSON 导入导出</p>
      </div>
      <div class="header-actions">
        <el-button @click="importVisible = true">导入 CC Switch JSON</el-button>
        <el-dropdown trigger="click">
          <el-button type="primary">新建配置</el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                v-for="preset in presets"
                :key="preset.id"
                @click="handleCreateFromPreset(preset)"
              >
                {{ preset.name }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <el-alert
      v-if="runtime"
      :title="`当前运行：${runtime.profileName} · ${providerLabel(runtime.provider)} · ${runtime.model}`"
      type="success"
      show-icon
      :closable="false"
      class="runtime-alert"
    />
    <el-alert
      v-else
      title="未激活 AI 配置 — 请在左侧选择或导入配置后点击「启用」"
      type="warning"
      show-icon
      :closable="false"
      class="runtime-alert"
    />

    <div class="ai-management__body">
      <!-- 左侧配置列表 -->
      <aside class="profile-sidebar">
        <div class="sidebar-title">配置列表</div>
        <div
          v-for="profile in profiles"
          :key="profile.id"
          class="profile-item"
          :class="{ active: selectedId === profile.id, enabled: activeProfileId === profile.id }"
          @click="selectedId = profile.id"
        >
          <div class="profile-item__main">
            <span class="profile-item__name">{{ profile.name }}</span>
            <span class="profile-item__provider">{{ providerLabel(profile.provider) }}</span>
          </div>
          <div class="profile-item__actions">
            <el-tag v-if="activeProfileId === profile.id" size="small" type="success">运行中</el-tag>
            <el-button
              v-else
              size="small"
              type="primary"
              link
              @click.stop="handleActivate(profile.id)"
            >
              启用
            </el-button>
          </div>
        </div>
        <el-empty v-if="!profiles.length" description="暂无配置，请导入或新建" :image-size="60" />
      </aside>

      <!-- 右侧编辑器 -->
      <main class="profile-editor" v-if="selectedProfile">
        <div class="editor-toolbar">
          <el-input v-model="formName" placeholder="配置名称" style="max-width: 240px" />
          <el-radio-group v-model="editMode" size="small">
            <el-radio-button label="visual">可视化</el-radio-button>
            <el-radio-button label="json">JSON</el-radio-button>
          </el-radio-group>
          <div class="toolbar-spacer" />
          <el-button :loading="testing" @click="handleTest">测试连接</el-button>
          <el-button @click="handleExport">导出 JSON</el-button>
          <el-button type="danger" plain @click="handleDelete">删除</el-button>
          <el-button type="primary" @click="handleSave">保存</el-button>
        </div>

        <div v-show="editMode === 'visual'" class="visual-editor">
          <el-form label-width="160px" label-position="left">
            <el-form-item
              v-for="field in envFields"
              :key="field.key"
              :label="field.label"
              :required="field.required"
            >
              <el-input
                v-model="formConfig.env[field.key]"
                :type="field.secret ? 'password' : 'text'"
                :placeholder="field.placeholder || field.key"
                show-password
              />
            </el-form-item>

            <el-divider />

            <el-form-item label="includeCoAuthoredBy">
              <el-switch v-model="formConfig.includeCoAuthoredBy" />
              <span class="field-hint">CC Switch 兼容字段</span>
            </el-form-item>

            <el-form-item label="自定义 env 变量">
              <el-input
                v-model="formConfig.env['CUSTOM_KEY']"
                placeholder="可手动在 JSON 模式添加更多 env 键"
                disabled
              />
              <span class="field-hint">更多变量请切换到 JSON 模式编辑</span>
            </el-form-item>
          </el-form>
        </div>

        <div v-show="editMode === 'json'" class="json-editor">
          <p class="json-hint">
            支持 CC Switch 格式：<code>{ "env": { "ANTHROPIC_AUTH_TOKEN": "...", ... }, "includeCoAuthoredBy": false }</code>
          </p>
          <el-input
            v-model="jsonText"
            type="textarea"
            :rows="18"
            font-family="monospace"
            placeholder="粘贴 CC Switch JSON..."
          />
        </div>
      </main>

      <main class="profile-editor empty" v-else>
        <el-empty description="选择左侧配置或导入 CC Switch JSON" />
      </main>
    </div>

    <!-- 导入对话框 -->
    <el-dialog v-model="importVisible" title="导入 CC Switch 配置" width="600px">
      <p class="import-hint">粘贴 Claude Code / CC Switch 导出的 JSON 配置</p>
      <el-input v-model="importJson" type="textarea" :rows="14" placeholder='{"env":{...},"includeCoAuthoredBy":false}' />
      <template #footer>
        <el-button @click="importVisible = false">取消</el-button>
        <el-button type="primary" @click="handleImport">导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.ai-management {
  min-height: 500px;
}

.ai-management__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-4);
  flex-wrap: wrap;
  gap: var(--spacing-3);
}

.ai-management__header h2 {
  margin: 0 0 var(--spacing-1);
}

.subtitle {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.header-actions {
  display: flex;
  gap: var(--spacing-2);
}

.runtime-alert {
  margin-bottom: var(--spacing-4);
}

.ai-management__body {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: var(--spacing-4);
  min-height: 480px;
}

.profile-sidebar {
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: var(--border-radius-xl);
  padding: var(--spacing-3);
  overflow-y: auto;
}

.sidebar-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-tertiary);
  padding: var(--spacing-2) var(--spacing-3);
  margin-bottom: var(--spacing-2);
}

.profile-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-3);
  border-radius: var(--border-radius-lg);
  cursor: pointer;
  border: 1px solid transparent;
  margin-bottom: var(--spacing-1);
  transition: var(--transition-fast);
}

.profile-item:hover {
  background: var(--bg-secondary);
}

.profile-item.active {
  background: var(--ai-accent-light);
  border-color: var(--ai-accent);
}

.profile-item.enabled {
  border-left: 3px solid var(--success-color);
}

.profile-item__name {
  display: block;
  font-weight: var(--font-weight-medium);
  font-size: var(--font-size-sm);
}

.profile-item__provider {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.profile-editor {
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: var(--border-radius-xl);
  padding: var(--spacing-5);
}

.profile-editor.empty {
  display: flex;
  align-items: center;
  justify-content: center;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-5);
  flex-wrap: wrap;
}

.toolbar-spacer {
  flex: 1;
}

.visual-editor {
  max-width: 640px;
}

.field-hint {
  margin-left: var(--spacing-2);
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.json-hint {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-3);
}

.json-hint code {
  font-size: var(--font-size-xs);
  background: var(--bg-secondary);
  padding: 2px 6px;
  border-radius: 4px;
}

.import-hint {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-3);
}

@media (max-width: 900px) {
  .ai-management__body {
    grid-template-columns: 1fr;
  }
}
</style>
